import { Injectable } from '@angular/core';
import { ConnectingStage, ConnectionController, ConnectionState } from './ConnectionController.service';

// Desktop beacons mobileHostInfo every 5s (MOBILE_BEACON_INTERVAL_MS in desktop's
// ConnectionController.ts) - allow a few missed beacons before treating a host as gone.
const HOST_EXPIRY_MS = 15000;
const FAILOVER_CHECK_INTERVAL_MS = 8000;
// No gameState frame from the selected host in this long means it's worth trying someone else.
const SELECTED_HOST_STALE_MS = 2000;

interface HostRecord {
	/** Always true in practice - desktop only ever beacons when its own Mobile Host setting is on. */
	isHostingMobile: boolean;
	isGameHost: boolean;
	lastSeen: number;
}

/**
 * Picks which desktop client to receive game state from and fails over automatically when it
 * goes quiet. This has no desktop equivalent (desktop *is* the host); it existed inline in
 * ConnectionController as `ConnectionCheck()`, which had four bugs the parity audit flagged:
 * the wraparound index could reach an index nothing matches (skipping a whole pass with no
 * host selected), `index++` living inside an `||` meant it didn't advance on game-host matches,
 * the forEach had no early exit so a later match silently overwrote an earlier one in the same
 * pass, and beacon entries were never expired so a host that vanished stayed eligible forever.
 * Rewritten here as its own service with a plain, testable selection algorithm.
 */
@Injectable({
	providedIn: 'root',
})
export class MobileHostService {
	private hosts = new Map<string, HostRecord>();
	private lastSelectedIndex = -1;
	private checkTimer?: ReturnType<typeof setTimeout>;

	constructor(private connectionController: ConnectionController) {
		this.connectionController.events.on('connecting', () => this.reset());
		this.connectionController.events.on(
			'mobileHostBeacon',
			(from: string, info: { isHostingMobile: boolean; isGameHost: boolean }) => {
				this.onBeacon(from, info);
			}
		);
		this.scheduleCheck();
	}

	/** Whether `socketId` has ever been seen broadcasting a Mobile Host beacon (used for UI/isbetter). */
	public isKnownDesktopHost(socketId: string): boolean {
		return this.hosts.has(socketId);
	}

	private reset(): void {
		this.hosts.clear();
		this.lastSelectedIndex = -1;
	}

	private onBeacon(from: string, info: { isHostingMobile: boolean; isGameHost: boolean }): void {
		const isNewHost = !this.hosts.has(from);
		this.hosts.set(from, { ...info, lastSeen: Date.now() });

		if (this.connectionController.connectionState === ConnectionState.disconnected) return;

		// Don't wait for the next periodic check to react - either we had nobody selected yet, or
		// the actual game host just appeared/reappeared and should be preferred immediately.
		if ((isNewHost && !this.connectionController.currentHost) || (info.isGameHost && this.connectionController.currentHost !== from)) {
			this.selectHost();
		}
	}

	private scheduleCheck(): void {
		this.checkTimer = setTimeout(() => {
			this.checkFailover();
			this.scheduleCheck();
		}, FAILOVER_CHECK_INTERVAL_MS);
	}

	private checkFailover(): void {
		if (this.connectionController.connectionState === ConnectionState.disconnected) {
			return;
		}

		const now = Date.now();
		for (const [socketId, record] of this.hosts) {
			if (now - record.lastSeen > HOST_EXPIRY_MS) {
				this.hosts.delete(socketId);
				if (this.connectionController.currentHost === socketId) {
					this.connectionController.currentHost = undefined;
				}
			}
		}

		const selectedHostStale =
			this.connectionController.currentHost !== undefined &&
			this.connectionController.lastPing !== -1 &&
			now - this.connectionController.lastPing > SELECTED_HOST_STALE_MS;

		if (!this.connectionController.currentHost || selectedHostStale) {
			if (selectedHostStale) {
				this.connectionController.currentHost = undefined;
			}
			this.selectHost();
		}
	}

	/**
	 * Prefers the actual Among Us game host when known; otherwise deterministically round-robins
	 * through the other eligible hosts, wrapping correctly at the list boundary.
	 */
	private selectHost(): void {
		const gameHost = Array.from(this.hosts.entries()).find(([, record]) => record.isGameHost);
		if (gameHost) {
			this.chooseHost(gameHost[0]);
			return;
		}

		const eligible = Array.from(this.hosts.keys());
		if (eligible.length === 0) {
			this.connectionController.currentHost = undefined;
			return;
		}
		this.lastSelectedIndex = (this.lastSelectedIndex + 1) % eligible.length;
		this.chooseHost(eligible[this.lastSelectedIndex]);
	}

	private chooseHost(socketId: string): void {
		if (this.connectionController.currentHost === socketId) return;
		this.connectionController.currentHost = socketId;
		this.connectionController.socketIOClient?.emit('signal', {
			to: socketId,
			data: { mobilePlayerInfo: { code: this.connectionController.gamecode, askingForHost: true } },
		});
		this.connectionController.updateConnectingStage(ConnectingStage.waitingForHostToEnable);
	}
}
