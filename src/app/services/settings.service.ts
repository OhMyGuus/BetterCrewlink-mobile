import { Injectable } from '@angular/core';
import { VoiceServerOption, PlayerSettingsMap, PlayerSetting } from './smallInterfaces';
import { ISettings } from '../common/ISettings';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

const DEFAULTSETTINGS: Omit<ISettings, 'playerSettings'> = {
	gamecode: '',
	voiceServerOption: VoiceServerOption.BETTERCREWLINK,
	customVoiceServer: 'https://bettercrewl.ink',
	username: '',
	selectedMicrophone: { id: 0, label: 'default', deviceId: 'default', kind: 'audioinput' },
	selectedSpeaker: undefined,
	natFix: false,
	overlayEnabled: false,
	isMobile: false,
	// Matches desktop's persisted defaults (settingsStore.ts).
	ghostVolumeAsImpostor: 10,
	crewVolumeAsGhost: 100,
	masterVolume: 100,
	enableSpatialAudio: true,
	echoCancellation: true,
	noiseSuppression: true,
	autoGainControl: false,
	microphoneGain: 100,
	microphoneGainEnabled: false,
	micSensitivity: 0.15,
	micSensitivityEnabled: false,
};

const DEFAULTPLAYERSETTING: PlayerSetting = {
	volume: 100,
	isMuted: false,
};

@Injectable({
	providedIn: 'root',
})
export class SettingsService {
	// Cloned per-instance (not shared off a module-level constant) - the map in particular must
	// not be shared, or every SettingsService would silently alias the same player-settings store.
	private settings: ISettings = { ...DEFAULTSETTINGS, playerSettings: new PlayerSettingsMap() };
	IsMobile: boolean;
	loaded = false;
	private loadPromise: Promise<void> | undefined;
	private pendingSave: Promise<void> = Promise.resolve();

	constructor(
		private storage: Storage,
		private platform: Platform
	) {
		this.IsMobile = this.platform.is('cordova') || this.platform.is('capacitor');
	}

	get() {
		if (this.settings.isMobile !== this.IsMobile) {
			this.settings.isMobile = this.IsMobile;
		}
		return this.settings;
	}

	/**
	 * `playerSettings` is only ever written as a Map in this class, but the value can still
	 * arrive as something else at access time: older clients persisted the raw Map (which
	 * JSON-based storage drivers flatten to a plain object), a record written by the current
	 * serializer is an entries array until load() converts it, and callers holding the object
	 * returned by get() could replace the field outright. Normalize on access so `.has`/`.set`
	 * below can never throw "playerSettings.has is not a function".
	 */
	private ensurePlayerSettingsMap(): PlayerSettingsMap {
		if (!(this.settings.playerSettings instanceof Map)) {
			console.warn('Settings.playerSettings was not a Map; converting persisted value:', this.settings.playerSettings);
			this.settings.playerSettings = this.deserializePlayerSettings(this.settings.playerSettings as unknown);
		}
		return this.settings.playerSettings;
	}

	/** `key` is a player's stable `playerConfigId` (falls back to a name hash for older hosts). */
	getPlayerSettings(key: number): PlayerSetting {
		const playerSettings = this.ensurePlayerSettingsMap();
		if (!playerSettings.has(key)) {
			return { ...DEFAULTPLAYERSETTING };
		}
		return playerSettings.get(key);
	}

	savePlayerSetting(key: number, playerSetting: PlayerSetting) {
		this.ensurePlayerSettingsMap().set(key, playerSetting);
		this.save();
	}

	getVoiceServer() {
		switch (this.settings.voiceServerOption) {
			case VoiceServerOption.ORIGINALCREWLINK:
			case VoiceServerOption.BETTERCREWLINK:
				return 'https://bettercrewl.ink';
			case VoiceServerOption.CUSTOM:
				return !this.IsMobile && this.settings.customVoiceServer.includes('//crewl.ink')
					? 'https://ubuntu1.guus.info'
					: this.settings.customVoiceServer;
		}
	}

	/** Fire-and-forget is fine for callers; writes are still chained so they can't race each other. */
	save(): Promise<void> {
		this.pendingSave = this.pendingSave
			.then(() => this.storage.set('settings', this.serialize()))
			.catch((error) => {
				console.warn('Failed to save settings (changes may be lost on restart):', error);
			});
		return this.pendingSave;
	}

	private serialize(): unknown {
		return {
			...this.settings,
			// Map doesn't survive every storage driver's serialization path (IndexedDB's
			// structured clone preserves it - minus the PlayerSettingsMap subclass - but the
			// localStorage driver JSON-stringifies it down to `{}`), so store it as entries.
			playerSettings: Array.from(this.ensurePlayerSettingsMap().entries()),
		};
	}

	/** Accepts a real Map, an array of entries, or a plain object - whatever a given storage driver produced. */
	private deserializePlayerSettings(value: unknown): PlayerSettingsMap {
		const map = new PlayerSettingsMap();
		if (!value) return map;
		const setEntry = (key: unknown, playerSetting: unknown) => {
			const numericKey = Number(key);
			if (Number.isNaN(numericKey) || typeof playerSetting !== 'object' || playerSetting === null) return;
			map.set(numericKey, { ...DEFAULTPLAYERSETTING, ...(playerSetting as Partial<PlayerSetting>) });
		};

		if (value instanceof Map) {
			for (const [key, playerSetting] of value) setEntry(key, playerSetting);
		} else if (Array.isArray(value)) {
			for (const entry of value) {
				if (Array.isArray(entry) && entry.length === 2) setEntry(entry[0], entry[1]);
			}
		} else if (typeof value === 'object') {
			for (const key of Object.keys(value)) setEntry(key, (value as Record<string, unknown>)[key]);
		}
		return map;
	}

	async load(): Promise<void> {
		if (!this.loadPromise) {
			this.loadPromise = this.doLoad();
		}
		return this.loadPromise;
	}

	private async doLoad(): Promise<void> {
		try {
			await this.storage.create();
		} catch (error) {
			// No usable storage backend on this platform/browser - keep running on in-memory
			// defaults for this session rather than failing startup.
			console.warn('Ionic Storage failed to initialize; settings will not persist this session:', error);
			this.loaded = true;
			return;
		}

		try {
			const loadedSettings = await this.storage.get('settings');
			if (loadedSettings) {
				for (const key of Object.keys(this.settings)) {
					if (key === 'playerSettings') continue;
					if (key in loadedSettings) {
						this.settings[key] = loadedSettings[key];
					}
				}
				this.settings.playerSettings = this.deserializePlayerSettings(loadedSettings.playerSettings);
			}
		} catch (error) {
			console.warn('Failed to read stored settings; using defaults:', error);
		}
		this.loaded = true;
	}
}
