// White-box access to serialize()/deserializePlayerSettings() is deliberate: they're the
// load-bearing storage-migration logic and have no public seam.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SettingsService } from './settings.service';
import { PlayerSettingsMap } from './smallInterfaces';

function makeStorage(initialValue?: unknown) {
	return {
		create: jasmine.createSpy('create').and.returnValue(Promise.resolve()),
		get: jasmine.createSpy('get').and.returnValue(Promise.resolve(initialValue)),
		set: jasmine.createSpy('set').and.returnValue(Promise.resolve()),
	};
}

// SettingsService only uses platform.is() in its constructor.
const platform = { is: () => false } as any;

describe('SettingsService', () => {
	describe('player settings serialization', () => {
		it('serializes the player-settings map as an array of entries', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			service.get().playerSettings.set(123, { volume: 200, isMuted: true });

			expect((service as any).serialize().playerSettings).toEqual([[123, { volume: 200, isMuted: true }]]);
		});

		it('deserializes an array of entries (the shape serialize() writes)', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			const map = (service as any).deserializePlayerSettings([[123, { volume: 200, isMuted: true }]]);
			expect(map.get(123)).toEqual({ volume: 200, isMuted: true });
		});

		it('deserializes a plain object (what the localStorage driver produces after JSON round-trip)', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			const map = (service as any).deserializePlayerSettings({ '123': { volume: 50 } });
			expect(map.get(123)).toEqual(jasmine.objectContaining({ volume: 50, isMuted: false }));
		});

		it('deserializes a real Map (what the IndexedDB driver preserves)', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			const input = new Map([[7, { volume: 10, isMuted: true }]]);
			expect((service as any).deserializePlayerSettings(input).get(7).volume).toBe(10);
		});

		it('ignores malformed entries and garbage input instead of throwing', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			expect((service as any).deserializePlayerSettings(null).size).toBe(0);
			expect((service as any).deserializePlayerSettings([['bad', null]]).size).toBe(0);
			expect((service as any).deserializePlayerSettings([['123']]).size).toBe(0);
		});
	});

	describe('load()', () => {
		it('awaits storage.create() before reading stored settings', async () => {
			const storage = makeStorage({ username: 'Guus' });
			const service = new SettingsService(storage as any, platform);
			await service.load();

			expect(storage.create).toHaveBeenCalled();
			expect(service.get().username).toBe('Guus');
		});

		it('keeps working on in-memory defaults when storage initialization fails', async () => {
			const storage = makeStorage();
			storage.create.and.returnValue(Promise.reject(new Error('no driver')));
			const service = new SettingsService(storage as any, platform);
			await service.load();

			expect(service.get().username).toBe('');
			expect(service.loaded).toBeTrue();
		});

		it('keeps working on defaults when the stored value cannot be read', async () => {
			const storage = makeStorage();
			storage.get.and.returnValue(Promise.reject(new Error('corrupt')));
			const service = new SettingsService(storage as any, platform);
			await service.load();

			expect(service.get().username).toBe('');
			expect(service.loaded).toBeTrue();
		});
	});

	describe('playerSettings normalization at access time', () => {
		// Regression: a playerSettings that is not a real Map at the moment getPlayerSettings
		// runs (e.g. a JSON-round-tripped plain object, an entries array, or a foreign caller
		// replacing the field on the object get() returned) used to throw
		// "playerSettings.has is not a function" and break the whole hostUpdate audio pipeline.
		it('does not throw when playerSettings was replaced by a plain object', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			(service.get() as any).playerSettings = { 123: { volume: 200 } };

			expect(service.getPlayerSettings(123)).toEqual(jasmine.objectContaining({ volume: 200, isMuted: false }));
			expect(service.getPlayerSettings(999)).toEqual({ volume: 100, isMuted: false });

			service.savePlayerSetting(123, { volume: 50, isMuted: true });
			expect(service.get().playerSettings.get(123)).toEqual({ volume: 50, isMuted: true });
		});

		it('normalizes an entries array that ended up in place of the map', () => {
			const service = new SettingsService(makeStorage() as any, platform);
			(service.get() as any).playerSettings = [[7, { volume: 10, isMuted: true }]];

			expect(service.getPlayerSettings(7).volume).toBe(10);
			expect(service.get().playerSettings).toEqual(jasmine.any(PlayerSettingsMap));
		});

		it('serializes cleanly even after normalizing a foreign playerSettings', async () => {
			const storage = makeStorage();
			const service = new SettingsService(storage as any, platform);
			(service.get() as any).playerSettings = { 1: { volume: 1 } };

			await service.save();

			expect((service as any).serialize().playerSettings).toEqual([[1, { volume: 1, isMuted: false }]]);
			expect(storage.set).toHaveBeenCalledWith('settings', jasmine.any(Object));
		});
	});
});
