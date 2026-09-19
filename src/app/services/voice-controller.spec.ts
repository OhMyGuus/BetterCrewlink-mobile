// White-box access to impostor-radio internals (impostorRadioClientId, cleanupImpostorRadio,
// onPeerData) is deliberate: there's no public seam for them and adding one just for tests
// would leak state machine internals into the real API.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { VoiceController, normalizeUsername, matchLocalPlayer, playerSettingsKey } from './voice-controller.service';
import { ConnectionController, ConnectionState } from './ConnectionController.service';
import { MobileHostService } from './mobile-host.service';
import { SettingsService } from './settings.service';
import { AmongUsState, GameState, Player } from '../common/AmongUsState';
import { CameraLocation, MapType } from '../common/AmongusMap';
import { defaultLobbySettings } from '../voice/types';

/** A real (not faked) MediaStream - AudioContext.createMediaStreamSource requires an actual instance. */
function createSilentStream(): MediaStream {
	return new AudioContext().createMediaStreamDestination().stream;
}

function makePlayer(overrides: Partial<Player> = {}): Player {
	return {
		ptr: 0,
		id: 0,
		clientId: 0,
		name: 'Player',
		nameHash: 0,
		playerConfigId: 0,
		friendCode: '',
		playerUid: '',
		playerIdentifier: '',
		colorId: 0,
		hatId: '0',
		petId: 0,
		skinId: '0',
		visorId: '0',
		disconnected: false,
		isImpostor: false,
		isDead: false,
		taskPtr: 0,
		objectPtr: 0,
		isLocal: false,
		shiftedColor: 0,
		bugged: false,
		x: 0,
		y: 0,
		inVent: false,
		isDummy: false,
		isbetter: false,
		...overrides,
	};
}

function makeState(overrides: Partial<AmongUsState> = {}): AmongUsState {
	return {
		gameState: GameState.TASKS,
		oldGameState: GameState.TASKS,
		lobbyCodeInt: 0,
		lobbyCode: 'ABCD',
		players: [],
		isHost: false,
		clientId: 0,
		hostId: 0,
		comsSabotaged: false,
		currentCamera: CameraLocation.NONE,
		map: MapType.THE_SKELD,
		lightRadius: 1,
		lightRadiusChanged: false,
		closedDoors: [],
		maxPlayers: 10,
		mod: 'NONE',
		oldMeetingHud: false,
		...overrides,
	};
}

describe('normalizeUsername / matchLocalPlayer', () => {
	it('trims, collapses whitespace and lowercases', () => {
		expect(normalizeUsername('  Guus   Wars ')).toBe('guus wars');
	});

	it('strips rich-text tags', () => {
		expect(normalizeUsername('<color=red>Guus</color>')).toBe('guus');
	});

	it('matches case- and whitespace-insensitively', () => {
		const players = [makePlayer({ id: 1, name: 'Guus  Wars' })];
		const result = matchLocalPlayer(players, '  guus wars');
		expect(result.player).toBe(players[0]);
		expect(result.ambiguous).toBeFalse();
	});

	it('flags multiple matches as ambiguous but still returns the first', () => {
		const players = [makePlayer({ id: 1, name: 'Guus' }), makePlayer({ id: 2, name: 'guus' })];
		const result = matchLocalPlayer(players, 'Guus');
		expect(result.player).toBe(players[0]);
		expect(result.ambiguous).toBeTrue();
	});

	it('returns undefined when nothing matches', () => {
		const result = matchLocalPlayer([makePlayer({ name: 'Someone Else' })], 'Guus');
		expect(result.player).toBeUndefined();
		expect(result.ambiguous).toBeFalse();
	});
});

describe('VoiceController impostor radio', () => {
	/** Minimal SettingsService fake: AudioController.ensureOutputBus reads selectedSpeaker from get(). */
	function makeFakeSettingsService(): SettingsService {
		return {
			get: () => ({
				selectedSpeaker: undefined,
				autoGainControl: false,
				microphoneGainEnabled: false,
				micSensitivityEnabled: false,
			}),
			getPlayerSettings: () => ({ volume: 100, isMuted: false }),
		} as unknown as SettingsService;
	}

	function makeController(): VoiceController {
		const connectionController = new ConnectionController(makeFakeSettingsService());
		return new VoiceController(connectionController, new MobileHostService(connectionController), makeFakeSettingsService());
	}

	function readyState(connectionController: ConnectionController, me: Player, others: Player[] = []): void {
		connectionController.lobbySettings = { ...defaultLobbySettings, impostorRadioEnabled: true };
		connectionController.localPLayer = me;
		connectionController.currentGameState = makeState({ players: [me, ...others] });
	}

	it('grants transmission for a living impostor during TASKS when radio is enabled', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: true, isDead: false });
		readyState(connectionController, me);

		voiceController.applyImpostorRadio(true);

		expect(connectionController.audioController.radioTransmitting).toBeTrue();
		expect((voiceController as any).impostorRadioClientId).toBe(1);
	});

	it('does not grant transmission when impostorRadioEnabled is off', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: true, isDead: false });
		readyState(connectionController, me);
		connectionController.lobbySettings.impostorRadioEnabled = false;

		voiceController.applyImpostorRadio(true);

		expect(connectionController.audioController.radioTransmitting).toBeFalse();
	});

	it('does not grant transmission for crew', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: false, isDead: false });
		readyState(connectionController, me);

		voiceController.applyImpostorRadio(true);

		expect(connectionController.audioController.radioTransmitting).toBeFalse();
	});

	it('does not grant transmission for a dead impostor', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: true, isDead: true });
		readyState(connectionController, me);

		voiceController.applyImpostorRadio(true);

		expect(connectionController.audioController.radioTransmitting).toBeFalse();
	});

	it('releases transmission and broadcasts the release to peers', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: true, isDead: false });
		const other = makePlayer({ id: 2, clientId: 2 });
		readyState(connectionController, me, [other]);
		(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
		const sendSpy = spyOn(connectionController, 'sendToPeers');

		voiceController.applyImpostorRadio(true);
		sendSpy.calls.reset();
		voiceController.applyImpostorRadio(false);

		expect(connectionController.audioController.radioTransmitting).toBeFalse();
		expect((voiceController as any).impostorRadioClientId).toBe(-1);
		expect(sendSpy).toHaveBeenCalledWith(['socket-2'], JSON.stringify({ impostorRadio: false }));
	});

	it('excludes bugged players from radio broadcast targets', () => {
		const voiceController = makeController();
		const connectionController = (voiceController as any).connectionController as ConnectionController;
		const me = makePlayer({ id: 1, clientId: 1, isImpostor: true, isDead: false });
		const buggedPlayer = makePlayer({ id: 2, clientId: 2, bugged: true });
		readyState(connectionController, me, [buggedPlayer]);
		(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
		const sendSpy = spyOn(connectionController, 'sendToPeers');

		voiceController.applyImpostorRadio(true);

		expect(sendSpy).toHaveBeenCalledWith([], JSON.stringify({ impostorRadio: true }));
	});

	describe('cleanupImpostorRadio', () => {
		it('clears radio state once the transmitting impostor is no longer valid (dead)', () => {
			const voiceController = makeController();
			const connectionController = (voiceController as any).connectionController as ConnectionController;
			const me = makePlayer({ id: 1, clientId: 1, isImpostor: false });
			const transmitter = makePlayer({ id: 2, clientId: 2, isImpostor: true, isDead: true });
			(voiceController as any).impostorRadioClientId = 2;
			(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
			connectionController.audioController.addPeer('socket-2', createSilentStream());

			const state = makeState({ players: [me, transmitter] });
			(voiceController as any).cleanupImpostorRadio(state, me);

			expect((voiceController as any).impostorRadioClientId).toBe(-1);
		});

		it('leaves radio state alone while the transmitting impostor is still alive and connected', () => {
			const voiceController = makeController();
			const connectionController = (voiceController as any).connectionController as ConnectionController;
			const me = makePlayer({ id: 1, clientId: 1, isImpostor: false });
			const transmitter = makePlayer({ id: 2, clientId: 2, isImpostor: true, isDead: false });
			(voiceController as any).impostorRadioClientId = 2;
			(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
			connectionController.audioController.addPeer('socket-2', createSilentStream());

			const state = makeState({ players: [me, transmitter] });
			(voiceController as any).cleanupImpostorRadio(state, me);

			expect((voiceController as any).impostorRadioClientId).toBe(2);
		});

		it('clears radio state once the round leaves TASKS', () => {
			const voiceController = makeController();
			const me = makePlayer({ id: 1, clientId: 1 });
			(voiceController as any).impostorRadioClientId = 2;

			const state = makeState({ gameState: GameState.DISCUSSION, players: [me] });
			(voiceController as any).cleanupImpostorRadio(state, me);

			expect((voiceController as any).impostorRadioClientId).toBe(-1);
		});
	});

	describe('onPeerData', () => {
		it('adopts the first incoming impostorRadio:true as the active transmitter', () => {
			const voiceController = makeController();
			const connectionController = (voiceController as any).connectionController as ConnectionController;
			(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };

			(voiceController as any).onPeerData('socket-2', { impostorRadio: true });

			expect((voiceController as any).impostorRadioClientId).toBe(2);
		});

		it('ignores a second transmitter while one is already active', () => {
			const voiceController = makeController();
			const connectionController = (voiceController as any).connectionController as ConnectionController;
			(connectionController as any).clients = {
				'socket-2': { playerId: 2, clientId: 2 },
				'socket-3': { playerId: 3, clientId: 3 },
			};
			(voiceController as any).impostorRadioClientId = 2;

			(voiceController as any).onPeerData('socket-3', { impostorRadio: true });

			expect((voiceController as any).impostorRadioClientId).toBe(2);
		});

		it('clears the active transmitter when it releases', () => {
			const voiceController = makeController();
			const connectionController = (voiceController as any).connectionController as ConnectionController;
			(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
			(voiceController as any).impostorRadioClientId = 2;

			(voiceController as any).onPeerData('socket-2', { impostorRadio: false });

			expect((voiceController as any).impostorRadioClientId).toBe(-1);
		});
	});
});

describe('VoiceController desktop 3.2.0 compatibility', () => {
	it('degrades to default lobby settings instead of throwing when the host sends none (3.2.0 payload shape)', () => {
		// Desktop 3.2.0 sent this payload under `activeLobbySettings` instead of `lobbySettings`,
		// so `lobbySettings` is undefined here - the same shape a 3.2.0 host produces today.
		const connectionController = new ConnectionController({} as SettingsService);
		const fakeSettingsService = {
			get: () => ({ ghostVolumeAsImpostor: 10, crewVolumeAsGhost: 100, masterVolume: 100, enableSpatialAudio: true }),
			getPlayerSettings: () => ({ volume: 100 }),
		} as unknown as SettingsService;
		new VoiceController(connectionController, new MobileHostService(connectionController), fakeSettingsService);
		connectionController.amongusUsername = 'Guus';
		connectionController.connectionState = ConnectionState.connecting;
		(connectionController as any).socketIOClient = {
			emit: jasmine.createSpy('emit'),
			on: jasmine.createSpy('on'),
		};

		const me = makePlayer({ id: 1, clientId: 1, name: 'Guus' });
		const state = makeState({ players: [me] });

		expect(() => {
			(connectionController.events as any).emit('hostUpdate', state, undefined);
		}).not.toThrow();

		expect(connectionController.connectionState as ConnectionState).not.toBe(ConnectionState.error);
		expect(connectionController.error).toBeUndefined();
		expect(connectionController.lobbySettings).toEqual(defaultLobbySettings);
		expect(connectionController.localPLayer).toBe(me);
	});
});

describe('VoiceController account identity', () => {
	it('re-claims friendCode/playerUid/playerIdentifier with the id event when the local player changes', () => {
		const fakeSettingsService = {
			get: () => ({ ghostVolumeAsImpostor: 10, crewVolumeAsGhost: 100, masterVolume: 100, enableSpatialAudio: true }),
			getPlayerSettings: () => ({ volume: 100, isMuted: false }),
		} as unknown as SettingsService;
		const connectionController = new ConnectionController(fakeSettingsService);
		new VoiceController(connectionController, new MobileHostService(connectionController), fakeSettingsService);
		const emitSpy = jasmine.createSpy('emit');
		(connectionController as any).socketIOClient = { emit: emitSpy };
		connectionController.amongusUsername = 'Guus';
		connectionController.connectionState = ConnectionState.conencted;
		// Prime a different local player so onGameState takes the identity re-claim branch.
		connectionController.localPLayer = makePlayer({ id: 1, clientId: 1, name: 'Guus' });

		const me = makePlayer({
			id: 2,
			clientId: 2,
			name: 'Guus',
			friendCode: 'ABC#1234',
			playerUid: 'puid-abc',
			playerIdentifier: 'puid-abc',
		});
		(connectionController.events as any).emit('hostUpdate', makeState({ players: [me] }), defaultLobbySettings);

		// Regression: this used to be emit('id', id, clientId) only, so the server saw us as a
		// pre-3.2.0 client with no account identity (no puid-based bans/spoof detection).
		expect(emitSpy).toHaveBeenCalledWith('id', 2, 2, 'ABC#1234', 'puid-abc', 'puid-abc');
	});
});

describe('playerSettingsKey', () => {
	it('prefers playerConfigId over nameHash', () => {
		expect(playerSettingsKey(makePlayer({ playerConfigId: 42, nameHash: 7 }))).toBe(42);
	});

	it('falls back to nameHash when the host sent no playerConfigId', () => {
		expect(playerSettingsKey(makePlayer({ playerConfigId: undefined, nameHash: 7 }))).toBe(7);
	});
});

describe('VoiceController per-player mute', () => {
	it('silences a muted player regardless of spatial gain', () => {
		const mutedSettings = { volume: 100, isMuted: true };
		const fakeSettingsService = {
			get: () => ({
				ghostVolumeAsImpostor: 10,
				crewVolumeAsGhost: 100,
				masterVolume: 100,
				enableSpatialAudio: true,
			}),
			getPlayerSettings: () => mutedSettings,
		} as unknown as SettingsService;

		const connectionController = new ConnectionController(fakeSettingsService);
		new VoiceController(connectionController, new MobileHostService(connectionController), fakeSettingsService);
		connectionController.amongusUsername = 'Guus';
		const me = makePlayer({ id: 1, clientId: 1, name: 'Guus' });
		const other = makePlayer({ id: 2, clientId: 2, name: 'Other', x: 1, y: 0 });
		connectionController.localPLayer = me;
		connectionController.currentGameState = makeState({ players: [me, other] });
		(connectionController as any).clients = { 'socket-2': { playerId: 2, clientId: 2 } };
		connectionController.audioController.addPeer('socket-2', createSilentStream());

		(connectionController.events as any).emit('hostUpdate', connectionController.currentGameState, defaultLobbySettings);

		expect((connectionController.audioController as any).peers.get('socket-2').gain.gain.value).toBe(0);
	});
});

describe('VoiceController getRenderablePlayers', () => {
	function makeFakeSettingsService(): SettingsService {
		return {
			get: () => ({ ghostVolumeAsImpostor: 10, crewVolumeAsGhost: 100, masterVolume: 100, enableSpatialAudio: true }),
			getPlayerSettings: () => ({ volume: 100, isMuted: false }),
		} as unknown as SettingsService;
	}

	function setup(
		others: Player[],
		clients: Record<string, { playerId: number; clientId: number }> = {},
		meOverrides: Partial<Player> = {}
	): { voiceController: VoiceController; connectionController: ConnectionController; me: Player } {
		const settingsService = makeFakeSettingsService();
		const connectionController = new ConnectionController(settingsService);
		const voiceController = new VoiceController(
			connectionController,
			new MobileHostService(connectionController),
			settingsService
		);
		const me = makePlayer({ id: 1, clientId: 1, name: 'Guus', ...meOverrides });
		connectionController.localPLayer = me;
		connectionController.currentGameState = makeState({ players: [me, ...others] });
		(connectionController as any).clients = clients;
		return { voiceController, connectionController, me };
	}

	it('includes players with no voice client and flags them disconnected', () => {
		const offline = makePlayer({ id: 2, clientId: 2, colorId: 5 });
		const { voiceController } = setup([offline], {});

		const players = voiceController.getRenderablePlayers();

		expect(players.length).toBe(1);
		expect(players[0].player).toBe(offline);
		expect(players[0].connectionState).toBe('disconnected');
	});

	it('flags a player on the voice server without an audio peer as novoice', () => {
		const waiting = makePlayer({ id: 2, clientId: 2, colorId: 5 });
		const { voiceController } = setup([waiting], { 'socket-2': { playerId: 2, clientId: 2 } });

		expect(voiceController.getRenderablePlayers()[0].connectionState).toBe('novoice');
	});

	it('flags a player with an established audio peer as connected', () => {
		const connected = makePlayer({ id: 2, clientId: 2, colorId: 5 });
		const { voiceController, connectionController } = setup([connected], {
			'socket-2': { playerId: 2, clientId: 2 },
		});
		connectionController.audioController.addPeer('socket-2', createSilentStream());

		expect(voiceController.getRenderablePlayers()[0].connectionState).toBe('connected');
	});

	it('treats a client whose clientId no longer matches the player as disconnected', () => {
		const stale = makePlayer({ id: 2, clientId: 2, colorId: 5 });
		// The socket map still has an entry for clientId 2, but the client there claims another id.
		const { voiceController } = setup([stale], { 'socket-2': { playerId: 9, clientId: 9 } });

		expect(voiceController.getRenderablePlayers()[0].connectionState).toBe('disconnected');
	});

	it('never includes the local player', () => {
		const { voiceController } = setup([]);

		expect(voiceController.getRenderablePlayers()).toEqual([]);
	});

	it('latches the dead state of disconnected players even though they have no peer', () => {
		const offlineDead = makePlayer({ id: 2, clientId: 2, colorId: 5, isDead: true });
		const { voiceController, connectionController } = setup([offlineDead], {}, { isDead: true });
		const state = connectionController.currentGameState;

		// Used to run only inside updatePeerAudio, which skips players without a peer.
		(voiceController as any).updatePlayerDeadStates(state, connectionController.localPLayer);

		const players = voiceController.getRenderablePlayers();
		expect(players[0].isDead).toBeTrue();
		expect(players[0].connectionState).toBe('disconnected');
	});

	it('sorts players by colorId', () => {
		const lime = makePlayer({ id: 2, clientId: 2, colorId: 9 });
		const red = makePlayer({ id: 3, clientId: 3, colorId: 0 });
		const { voiceController } = setup([lime, red]);

		expect(voiceController.getRenderablePlayers().map((item) => item.player.colorId)).toEqual([0, 9]);
	});
});
