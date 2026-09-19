// This spec white-box tests peer-reliability internals (timers, retry backoff, the flat
// clients/peers maps) that are deliberately private - there's no public seam for them, and
// adding one just for tests would leak internals into the real API. `as any` is the accepted
// escape hatch for that; disabled file-wide rather than per line.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConnectionController, ConnectionState } from './ConnectionController.service';
import { Client } from './smallInterfaces';
import PeerConnection from '../lib/PeerConnection';
import { SettingsService } from './settings.service';
import { environment } from '../../environments/environment';

/** A stream that satisfies PeerConnection's constructor without touching getUserMedia/mic permissions. */
function fakeStream(): MediaStream {
	return { getTracks: () => [] } as unknown as MediaStream;
}

function fakeConnection(overrides: Partial<PeerConnection> = {}): PeerConnection {
	return {
		initiator: true,
		connectionState: 'connected',
		writable: false,
		destroy: jasmine.createSpy('destroy'),
		signal: jasmine.createSpy('signal'),
		on: jasmine.createSpy('on'),
		...overrides,
	} as unknown as PeerConnection;
}

/** Builds a ConnectionController and pokes it into a state where canReconnectPeer('peer1') is true. */
function makeReadyController(): ConnectionController {
	const controller = new ConnectionController({} as SettingsService);
	controller.connectionState = ConnectionState.connecting;
	controller.gamecode = 'ABCD';
	controller.audioController.stream = fakeStream();
	(controller as any).socketIOClient = { connected: true, id: 'me', emit: jasmine.createSpy('emit') };
	(controller as any).clients = { peer1: { playerId: 1, clientId: 1 } as Client };
	return controller;
}

describe('ConnectionController peer reliability', () => {
	describe('canReconnectPeer', () => {
		it('is false before a connection attempt, mic stream, socket and gamecode are all in place', () => {
			const controller = new ConnectionController({} as SettingsService);
			expect((controller as any).canReconnectPeer('peer1')).toBeFalse();
		});

		it('is true once connecting, mic stream, connected socket, gamecode and a known client all line up', () => {
			const controller = makeReadyController();
			expect((controller as any).canReconnectPeer('peer1')).toBeTrue();
		});

		it('is false for its own socket id', () => {
			const controller = makeReadyController();
			expect((controller as any).canReconnectPeer('me')).toBeFalse();
		});

		it('is false for a socket id with no registered client', () => {
			const controller = makeReadyController();
			expect((controller as any).canReconnectPeer('unknown-socket')).toBeFalse();
		});

		it('is false once disconnected', () => {
			const controller = makeReadyController();
			controller.connectionState = ConnectionState.disconnected;
			expect((controller as any).canReconnectPeer('peer1')).toBeFalse();
		});
	});

	describe('setClients', () => {
		it('disconnects peers and cancels retry timers for sockets no longer listed', () => {
			const controller = new ConnectionController({} as SettingsService);
			const stalePeer = fakeConnection();
			(controller as any).peers.set('stale-socket', stalePeer);
			(controller as any).peerRetryAttempts.set('stale-socket', 3);
			(controller as any).clients = {
				'stale-socket': { playerId: 1, clientId: 1 } as Client,
				'keep-socket': { playerId: 2, clientId: 2 } as Client,
			};

			(controller as any).setClients({ 'keep-socket': { playerId: 2, clientId: 2 } as Client });

			expect(stalePeer.destroy).toHaveBeenCalled();
			expect((controller as any).peers.has('stale-socket')).toBeFalse();
			expect(controller.getClient('keep-socket')).toBeDefined();
			expect(controller.getClient('stale-socket')).toBeUndefined();
		});

		it('leaves peers alone when they are still present in the new client list', () => {
			const controller = new ConnectionController({} as SettingsService);
			const activePeer = fakeConnection();
			(controller as any).peers.set('active-socket', activePeer);
			(controller as any).clients = { 'active-socket': { playerId: 1, clientId: 1 } as Client };

			(controller as any).setClients({ 'active-socket': { playerId: 1, clientId: 1 } as Client });

			expect(activePeer.destroy).not.toHaveBeenCalled();
			expect((controller as any).peers.has('active-socket')).toBeTrue();
		});
	});

	describe('retryPeer backoff', () => {
		it('schedules bounded exponential backoff: 1s, 2s, 4s, 8s, then capped at 15s', () => {
			const controller = makeReadyController();
			const setTimeoutSpy = spyOn(window, 'setTimeout').and.callThrough();
			const expectedDelays = [1000, 2000, 4000, 8000, 15000, 15000];

			expectedDelays.forEach((expectedDelay, attemptIndex) => {
				const connection = fakeConnection();
				(controller as any).peers.set('peer1', connection);
				setTimeoutSpy.calls.reset();

				(controller as any).retryPeer('peer1', connection, 'simulated failure');

				expect((controller as any).peerRetryAttempts.get('peer1'))
					.withContext(`attempt count after failure #${attemptIndex + 1}`)
					.toBe(attemptIndex + 1);

				const scheduled = setTimeoutSpy.calls.all().find((call) => call.args[1] === expectedDelay);
				expect(scheduled).withContext(`expected a ${expectedDelay}ms retry timer to be scheduled`).toBeDefined();

				// Don't let the scheduled retry actually fire and reconnect for real - this test
				// only asserts on the backoff schedule, not the reconnection attempt itself.
				(controller as any).peerRetryTimers.forEach((timer: ReturnType<typeof setTimeout>) => clearTimeout(timer));
				(controller as any).peerRetryTimers.clear();
			});
		});

		it('gives up retrying (and forgets the attempt count) once the peer can no longer reconnect', () => {
			const controller = makeReadyController();
			const connection = fakeConnection();
			(controller as any).peers.set('peer1', connection);
			(controller as any).peerRetryAttempts.set('peer1', 2);

			controller.connectionState = ConnectionState.disconnected;
			(controller as any).retryPeer('peer1', connection, 'socket gone');

			expect((controller as any).peerRetryAttempts.has('peer1')).toBeFalse();
			expect((controller as any).peerRetryTimers.has('peer1')).toBeFalse();
		});

		it('ignores a stale reason for a peer that has already been replaced', () => {
			const controller = makeReadyController();
			const oldConnection = fakeConnection();
			const currentConnection = fakeConnection();
			(controller as any).peers.set('peer1', currentConnection);

			(controller as any).retryPeer('peer1', oldConnection, 'stale close event');

			// The stale connection's own close/error handler firing after a successful reconnect
			// must not tear down the connection that replaced it.
			expect((controller as any).peers.get('peer1')).toBe(currentConnection);
			expect(currentConnection.destroy).not.toHaveBeenCalled();
		});
	});

	describe('handleSignal duplicate-offer resolution', () => {
		it('creates exactly one connection when the same offer arrives twice', () => {
			const controller = makeReadyController();
			const payload = {
				data: { type: 'offer', sdp: 'sdp-1', connectionId: 'conn-1' },
				from: 'peer1',
			};

			(controller as any).handleSignal(payload);
			const firstConnection = (controller as any).peers.get('peer1');
			expect(firstConnection).toBeDefined();

			(controller as any).handleSignal(payload);
			expect((controller as any).peers.get('peer1')).toBe(firstConnection);

			firstConnection.destroy();
		});

		it('keeps our own outgoing offer and ignores the remote one when our socket id wins the tie-break', () => {
			const controller = makeReadyController();
			(controller as any).clients['zzz-socket'] = { playerId: 9, clientId: 9 } as Client;
			// Our own initiator attempt is still negotiating ('new'/'connecting').
			const ourAttempt = fakeConnection({ initiator: true, connectionState: 'connecting' });
			(controller as any).peers.set('zzz-socket', ourAttempt);

			// this.socketIOClient.id is 'me'; 'me' < 'zzz-socket', so our own attempt should win
			// (the lexicographically lower socket id's own outgoing offer always wins a race).
			(controller as any).handleSignal({
				data: { type: 'offer', sdp: 'remote-sdp', connectionId: 'remote-conn' },
				from: 'zzz-socket',
			});

			expect((controller as any).peers.get('zzz-socket')).toBe(ourAttempt);
			expect(ourAttempt.destroy).not.toHaveBeenCalled();
		});

		it('yields to the remote offer when both sides race and the remote socket id wins the tie-break', () => {
			const controller = makeReadyController();
			(controller as any).clients['aaa-socket'] = { playerId: 9, clientId: 9 } as Client;
			// Our own initiator attempt is still negotiating ('new'/'connecting').
			const ourAttempt = fakeConnection({ initiator: true, connectionState: 'new' });
			(controller as any).peers.set('aaa-socket', ourAttempt);

			// this.socketIOClient.id is 'me'; 'me' > 'aaa-socket', so the remote offer should win.
			(controller as any).handleSignal({
				data: { type: 'offer', sdp: 'remote-sdp', connectionId: 'remote-conn' },
				from: 'aaa-socket',
			});

			expect((controller as any).peers.get('aaa-socket')).not.toBe(ourAttempt);
			expect(ourAttempt.destroy).toHaveBeenCalled();
		});

		it('routes an answer to the existing connection for that socket', () => {
			const controller = makeReadyController();
			const existing = fakeConnection({ initiator: true });
			(controller as any).peers.set('peer1', existing);

			(controller as any).handleSignal({
				data: { type: 'answer', sdp: 'answer-sdp' },
				from: 'peer1',
			});

			expect(existing.signal).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'answer', sdp: 'answer-sdp' }));
		});

		it('ignores signals from a socket with no known client', () => {
			const controller = makeReadyController();
			(controller as any).handleSignal({
				data: { type: 'offer', sdp: 'sdp-1' },
				from: 'totally-unknown-socket',
			});
			expect((controller as any).peers.has('totally-unknown-socket')).toBeFalse();
		});
	});

	describe('connect timeout', () => {
		it('retries a peer connection that never completes negotiation within PEER_CONNECT_TIMEOUT_MS', () => {
			jasmine.clock().install();
			try {
				const controller = makeReadyController();
				const connection = (controller as any).createPeerConnection('peer1', true, { playerId: 1, clientId: 1 });
				expect((controller as any).peers.get('peer1')).toBe(connection);

				jasmine.clock().tick(30000);

				// The timed-out attempt must have been torn down and a retry counted - whether or
				// not a brand new PeerConnection was constructed synchronously as part of that.
				expect((controller as any).peerRetryAttempts.get('peer1')).toBeGreaterThan(0);
			} finally {
				jasmine.clock().uninstall();
			}
		});
	});

	describe('gameinfo', () => {
		it('reports web platform and default game-side fields in a browser build', () => {
			const controller = new ConnectionController({ IsMobile: false } as unknown as SettingsService);
			const info = (controller as any).buildGameInfo();
			expect(info).toEqual(
				jasmine.objectContaining({
					broadcastVersion: -1,
					offsetsVersion: -1,
					is64bit: false,
					platform: 'web',
					mod: 'NONE',
					mods: [],
				})
			);
		});

		it('reports mobile platform inside an APK', () => {
			const controller = new ConnectionController({ IsMobile: true } as unknown as SettingsService);
			expect((controller as any).buildGameInfo().platform).toBe('mobile');
		});

		it('reports the app version from the environment', () => {
			const controller = new ConnectionController({} as SettingsService);
			expect((controller as any).buildGameInfo().appVersion).toBe(environment.appVersion);
		});

		it('emits gameinfo over the socket', () => {
			const controller = new ConnectionController({} as SettingsService);
			const emitSpy = jasmine.createSpy('emit');
			(controller as any).socketIOClient = { emit: emitSpy };
			(controller as any).sendGameInfo((controller as any).buildGameInfo());

			expect(emitSpy).toHaveBeenCalledWith(
				'gameinfo',
				jasmine.objectContaining({ appVersion: environment.appVersion, platform: 'web' })
			);
		});
	});

	describe('emitId', () => {
		it('sends the full Among Us account identity, not just playerId/clientId', () => {
			const controller = new ConnectionController({} as SettingsService);
			const emitSpy = jasmine.createSpy('emit');
			(controller as any).socketIOClient = { emit: emitSpy };

			controller.emitId(12, 34, 'ABC#1234', 'puid-abc', 'puid-abc');

			expect(emitSpy).toHaveBeenCalledWith('id', 12, 34, 'ABC#1234', 'puid-abc', 'puid-abc');
		});

		it('defaults missing identity fields to empty strings for older hosts', () => {
			const controller = new ConnectionController({} as SettingsService);
			const emitSpy = jasmine.createSpy('emit');
			(controller as any).socketIOClient = { emit: emitSpy };

			controller.emitId(12, 34);

			expect(emitSpy).toHaveBeenCalledWith('id', 12, 34, '', '', '');
		});
	});
});
