import { AmongUsState, GameState, Player } from '../common/AmongUsState';
import { CameraLocation, MapType } from '../common/AmongusMap';
import { ILobbySettings, ISettings } from '../common/ISettings';
import { PlayerSettingsMap } from '../services/smallInterfaces';
import { defaultLobbySettings } from './types';
import { calculateVoiceAudio, VoiceAudioInput } from './spatialAudio';

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

function makeSettings(overrides: Partial<ISettings> = {}): ISettings {
	return {
		voiceServerOption: 1,
		customVoiceServer: '',
		username: '',
		gamecode: '',
		selectedMicrophone: { id: 0, label: 'default', deviceId: 'default', kind: 'audioinput' },
		selectedSpeaker: undefined,
		natFix: false,
		playerSettings: new PlayerSettingsMap(),
		overlayEnabled: false,
		isMobile: true,
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
		...overrides,
	};
}

function makeLobbySettings(overrides: Partial<ILobbySettings> = {}): ILobbySettings {
	return { ...defaultLobbySettings, ...overrides };
}

/** `me` is always id/clientId 1 (local, alive, crew); `other` is id/clientId 2, 1 unit away. */
function run(overrides: Partial<VoiceAudioInput> = {}) {
	return calculateVoiceAudio({
		state: makeState(),
		settings: makeSettings(),
		activeLobbySettings: makeLobbySettings(),
		me: makePlayer({ id: 1, clientId: 1, isLocal: true }),
		other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0 }),
		maxDistance: 5.32,
		impostorRadioClientId: -1,
		...overrides,
	});
}

describe('calculateVoiceAudio', () => {
	it('mutes a disconnected player regardless of state', () => {
		expect(run({ other: makePlayer({ disconnected: true }) }).gain).toBe(0);
	});

	it('mutes a dummy player regardless of state', () => {
		expect(run({ other: makePlayer({ isDummy: true }) }).gain).toBe(0);
	});

	it('mutes everyone in MENU', () => {
		expect(run({ state: makeState({ gameState: GameState.MENU }) }).gain).toBe(0);
	});

	it('hears a nearby player in TASKS at full gain', () => {
		expect(run().gain).toBe(1);
	});

	it('mutes players beyond maxDistance when cameras are disabled', () => {
		const result = run({
			other: makePlayer({ id: 2, clientId: 2, x: 100, y: 0 }),
			activeLobbySettings: makeLobbySettings({ hearThroughCameras: false }),
		});
		expect(result.gain).toBe(0);
	});

	it('mutes non-impostor crew when comms sabotage is active and enabled', () => {
		const result = run({
			state: makeState({ comsSabotaged: true }),
			activeLobbySettings: makeLobbySettings({ commsSabotage: true }),
			me: makePlayer({ id: 1, clientId: 1, isLocal: true, isImpostor: false, isDead: false }),
		});
		expect(result.gain).toBe(0);
	});

	it('does not mute crew for comms sabotage when the setting is disabled', () => {
		const result = run({
			state: makeState({ comsSabotaged: true }),
			activeLobbySettings: makeLobbySettings({ commsSabotage: false }),
		});
		expect(result.gain).toBe(1);
	});

	it('mutes players in vents unless hearImpostorsInVents is enabled', () => {
		const muted = run({ other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, inVent: true }) });
		expect(muted.gain).toBe(0);

		const heard = run({
			other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, inVent: true }),
			activeLobbySettings: makeLobbySettings({ hearImpostorsInVents: true }),
		});
		expect(heard.gain).not.toBe(0);
	});

	it('applies haunting reverb and ghostVolumeAsImpostor gain for a dead player heard by a living impostor', () => {
		const result = run({
			other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isDead: true }),
			me: makePlayer({ id: 1, clientId: 1, isLocal: true, isImpostor: true, isDead: false }),
			activeLobbySettings: makeLobbySettings({ haunting: true }),
			settings: makeSettings({ ghostVolumeAsImpostor: 25 }),
		});
		expect(result.gain).toBeCloseTo(0.25);
		expect(result.reverb).toBe(true);
	});

	it('mutes a dead player heard by a living player when haunting is off', () => {
		const result = run({ other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isDead: true }) });
		expect(result.gain).toBe(0);
	});

	it('in DISCUSSION, centers panning and only lets like hear like', () => {
		const deadHearsLiving = run({
			state: makeState({ gameState: GameState.DISCUSSION }),
			me: makePlayer({ id: 1, clientId: 1, isLocal: true, isDead: true }),
			other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isDead: false }),
		});
		expect(deadHearsLiving.gain).toBe(1);
		expect(deadHearsLiving.panPosition).toEqual([0, 0]);

		const livingHearsDead = run({
			state: makeState({ gameState: GameState.DISCUSSION }),
			other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isDead: true }),
		});
		expect(livingHearsDead.gain).toBe(0);
	});

	it('restricts to dead-only pairs and centers panning when deadOnly is enabled', () => {
		const result = run({
			me: makePlayer({ id: 1, clientId: 1, isLocal: true, isDead: true }),
			other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isDead: true }),
			activeLobbySettings: makeLobbySettings({ deadOnly: true }),
		});
		expect(result.gain).toBe(1);
		expect(result.panPosition).toEqual([0, 0]);
	});

	describe('impostor radio', () => {
		it('lets a living impostor hear the transmitting impostor regardless of distance', () => {
			const result = run({
				other: makePlayer({ id: 2, clientId: 2, x: 999, y: 999, isImpostor: true }),
				me: makePlayer({ id: 1, clientId: 1, isLocal: true, isImpostor: true }),
				activeLobbySettings: makeLobbySettings({ impostorRadioEnabled: true }),
				impostorRadioClientId: 2,
			});
			expect(result.gain).toBe(1);
			expect(result.muffle).toEqual({ type: 'highpass', frequency: 1000, q: 10 });
		});

		it('mutes the transmission for living crew when impostorRadioPrivate is enabled', () => {
			const result = run({
				other: makePlayer({ id: 2, clientId: 2, x: 1, y: 0, isImpostor: true }),
				me: makePlayer({ id: 1, clientId: 1, isLocal: true, isImpostor: false, isDead: false }),
				activeLobbySettings: makeLobbySettings({ impostorRadioEnabled: true, impostorRadioPrivate: true }),
				impostorRadioClientId: 2,
			});
			expect(result.gain).toBe(0);
		});

		it('does not grant radio range when impostorRadioEnabled is off', () => {
			const result = run({
				other: makePlayer({ id: 2, clientId: 2, x: 999, y: 999, isImpostor: true }),
				me: makePlayer({ id: 1, clientId: 1, isLocal: true, isImpostor: true }),
				activeLobbySettings: makeLobbySettings({ impostorRadioEnabled: false }),
				impostorRadioClientId: 2,
			});
			expect(result.gain).toBe(0);
		});
	});

	describe('walls block audio', () => {
		// Real geometry against MIRA_HQ door 0 (`doorMaps[MIRA_HQ][0] = 'M 44.942 37.086 H 47.27'`,
		// a horizontal segment in SVG space). poseCollide's transform is
		// `svgX = gameX + 40, svgY = 40 - gameY`, so a vertical game-space segment from
		// (5, 2) to (5, 4) becomes the SVG segment (45, 38)-(45, 36), which crosses the door's
		// line (svgY 37.086, svgX 44.942-47.27) at x=45. Chosen over spying on `poseCollide`
		// because ESM named exports aren't spy-able (their bindings aren't writable) - this
		// exercises the real ColliderMap collision math instead of stubbing it out.
		const wallBlockedMe = () => makePlayer({ id: 1, clientId: 1, isLocal: true, x: 5, y: 2 });
		const wallBlockedOther = () => makePlayer({ id: 2, clientId: 2, x: 5, y: 4 });

		it('mutes a within-range player when a closed door blocks the path and wallsBlockAudio is enabled', () => {
			const result = run({
				state: makeState({ map: MapType.MIRA_HQ, closedDoors: [0] }),
				me: wallBlockedMe(),
				other: wallBlockedOther(),
				activeLobbySettings: makeLobbySettings({ wallsBlockAudio: true }),
			});
			expect(result.gain).toBe(0);
		});

		it('ignores the same closed door when wallsBlockAudio is disabled', () => {
			const result = run({
				state: makeState({ map: MapType.MIRA_HQ, closedDoors: [0] }),
				me: wallBlockedMe(),
				other: wallBlockedOther(),
				activeLobbySettings: makeLobbySettings({ wallsBlockAudio: false }),
			});
			expect(result.gain).toBe(1);
		});

		it('does not block on a door that is not in the closed-doors list', () => {
			const result = run({
				state: makeState({ map: MapType.MIRA_HQ, closedDoors: [] }),
				me: wallBlockedMe(),
				other: wallBlockedOther(),
				activeLobbySettings: makeLobbySettings({ wallsBlockAudio: true }),
			});
			expect(result.gain).toBe(1);
		});

		it('does not wall-check for a dead listener (ghosts hear through walls)', () => {
			const result = run({
				state: makeState({ map: MapType.MIRA_HQ, closedDoors: [0] }),
				me: makePlayer({ id: 1, clientId: 1, isLocal: true, isDead: true, x: 5, y: 2 }),
				other: makePlayer({ id: 2, clientId: 2, isDead: true, x: 5, y: 4 }),
				activeLobbySettings: makeLobbySettings({ wallsBlockAudio: true, deadOnly: true }),
			});
			expect(result.gain).toBe(1);
		});
	});
});
