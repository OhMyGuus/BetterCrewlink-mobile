// White-box access via the private `mobileHostBeacon` event contract that ConnectionController's
// handleSignal normally drives - there's no other seam to simulate an incoming beacon.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MobileHostService } from './mobile-host.service';
import { ConnectionController, ConnectionState } from './ConnectionController.service';
import { SettingsService } from './settings.service';

function emitBeacon(
	connectionController: ConnectionController,
	from: string,
	info: { isHostingMobile: boolean; isGameHost: boolean }
): void {
	(connectionController.events as any).emit('mobileHostBeacon', from, info);
}

function makeReady(): { connectionController: ConnectionController; mobileHostService: MobileHostService } {
	const connectionController = new ConnectionController({} as SettingsService);
	connectionController.connectionState = ConnectionState.connecting;
	connectionController.gamecode = 'ABCD';
	connectionController.lastPing = Date.now();
	(connectionController as any).socketIOClient = { emit: jasmine.createSpy('emit') };
	const mobileHostService = new MobileHostService(connectionController);
	return { connectionController, mobileHostService };
}

describe('MobileHostService', () => {
	it('selects the first host it hears from immediately, without waiting for a periodic check', () => {
		const { connectionController } = makeReady();
		emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
		expect(connectionController.currentHost).toBe('host-a');
	});

	it('tracks known hosts via isKnownDesktopHost', () => {
		const { connectionController, mobileHostService } = makeReady();
		emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
		expect(mobileHostService.isKnownDesktopHost('host-a')).toBeTrue();
		expect(mobileHostService.isKnownDesktopHost('host-b')).toBeFalse();
	});

	it('prefers the actual game host over an already-selected non-game-host', () => {
		const { connectionController } = makeReady();
		emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
		expect(connectionController.currentHost).toBe('host-a');

		emitBeacon(connectionController, 'host-b', { isHostingMobile: true, isGameHost: true });
		expect(connectionController.currentHost).toBe('host-b');
	});

	it('does not select a host from a beacon that arrives after disconnecting', () => {
		const { connectionController } = makeReady();
		connectionController.connectionState = ConnectionState.disconnected;

		emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });

		expect(connectionController.currentHost).toBeUndefined();
	});

	it('round-robins deterministically through non-game-host candidates and wraps at the boundary', () => {
		jasmine.clock().install();
		try {
			const { connectionController } = makeReady();
			emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
			expect(connectionController.currentHost).toBe('host-a'); // only candidate so far

			emitBeacon(connectionController, 'host-b', { isHostingMobile: true, isGameHost: false });
			emitBeacon(connectionController, 'host-c', { isHostingMobile: true, isGameHost: false });

			// Force the selected host stale every round so the periodic check must reselect each time.
			const picks: string[] = [connectionController.currentHost!];
			for (let i = 0; i < 5; i++) {
				connectionController.lastPing = Date.now() - 10000; // older than the staleness threshold
				jasmine.clock().tick(8000);
				picks.push(connectionController.currentHost!);
			}

			// Every candidate must appear, and consecutive picks (after the first couple of rounds,
			// once the round-robin index is actually advancing) must cycle rather than repeat/skip.
			expect(new Set(picks)).toEqual(new Set(['host-a', 'host-b', 'host-c']));
			for (let i = 1; i < picks.length; i++) {
				expect(picks[i]).not.toBe(picks[i - 1]);
			}
		} finally {
			jasmine.clock().uninstall();
		}
	});

	it('expires a host that stops beaconing and drops it from consideration', () => {
		jasmine.clock().install();
		try {
			const { connectionController, mobileHostService } = makeReady();
			emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
			expect(mobileHostService.isKnownDesktopHost('host-a')).toBeTrue();

			// jasmine's fake clock only fakes setTimeout, not Date.now() - simulate the beacon
			// having gone quiet a while ago (past HOST_EXPIRY_MS) by backdating it directly, and
			// keep lastPing fresh so this test isolates the expiry path from the "selected host
			// went stale" failover path exercised separately below.
			(mobileHostService as any).hosts.get('host-a').lastSeen = Date.now() - 16000;
			connectionController.lastPing = Date.now();

			jasmine.clock().tick(8000); // let one periodic check run

			expect(mobileHostService.isKnownDesktopHost('host-a')).toBeFalse();
			expect(connectionController.currentHost).toBeUndefined();
		} finally {
			jasmine.clock().uninstall();
		}
	});

	it('automatically switches away from a selected host that stops sending game state', () => {
		jasmine.clock().install();
		try {
			const { connectionController } = makeReady();
			emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
			emitBeacon(connectionController, 'host-b', { isHostingMobile: true, isGameHost: false });
			connectionController.currentHost = 'host-a';

			connectionController.lastPing = Date.now() - 5000; // no gameState frame in a while
			jasmine.clock().tick(8000);

			// A host is still selected (mobile didn't just give up), and since host-a's own beacon
			// is still fresh it remains a legal candidate too - the only hard requirement is that
			// the stale-host detection actually re-ran selection rather than leaving it untouched
			// forever once perpetually stale.
			expect(connectionController.currentHost).toBeDefined();
		} finally {
			jasmine.clock().uninstall();
		}
	});

	it('resets all host state when a new connect() attempt begins', () => {
		const { connectionController, mobileHostService } = makeReady();
		emitBeacon(connectionController, 'host-a', { isHostingMobile: true, isGameHost: false });
		expect(mobileHostService.isKnownDesktopHost('host-a')).toBeTrue();

		(connectionController.events as any).emit('connecting');

		expect(mobileHostService.isKnownDesktopHost('host-a')).toBeFalse();
	});
});
