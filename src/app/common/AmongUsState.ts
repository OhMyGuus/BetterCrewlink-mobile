import { CameraLocation, MapType } from './AmongusMap';
import type { ILobbySettings } from './ISettings';
import { ModsType } from './Mods';

// --- verbatim from bettercrewlink (desktop) v3.2.1 src/common/AmongUsState.ts,
// with one documented mobile-only addition on `Player` (`isbetter`, set locally when
// a peer is a known BetterCrewLink desktop Mobile Host - see ConnectionController).
// See scripts/check-schema-drift.mjs for the field-coverage check against desktop.

export interface AmongUsState {
	gameState: GameState;
	oldGameState: GameState;
	lobbyCodeInt: number;
	lobbyCode: string;
	players: Player[];
	isHost: boolean;
	clientId: number;
	hostId: number;
	comsSabotaged: boolean;
	currentCamera: CameraLocation;
	map: MapType;
	lightRadius: number;
	lightRadiusChanged: boolean;
	closedDoors: number[];
	maxPlayers: number;
	mod: ModsType;
	oldMeetingHud: boolean;
}

export interface Player {
	ptr: number;
	id: number;
	clientId: number;
	name: string;
	nameHash: number;
	playerConfigId: number;
	friendCode: string;
	playerUid: string;
	playerIdentifier: string;
	colorId: number;
	hatId: string;
	petId: number;
	skinId: string;
	visorId: string;
	disconnected: boolean;
	isImpostor: boolean;
	isDead: boolean;
	taskPtr: number;
	objectPtr: number;
	isLocal: boolean;
	shiftedColor: number;
	bugged: boolean;
	x: number;
	y: number;
	inVent: boolean;
	isDummy: boolean;

	/** Mobile-only: true when this player's peer is a known BetterCrewLink Mobile Host. */
	isbetter: boolean;
}

export enum GameState {
	LOBBY,
	TASKS,
	DISCUSSION,
	MENU,
	UNKNOWN,
}

export interface Client {
	playerId: number;
	clientId: number;
}
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- keep desktop's shape
export interface SocketClientMap {
	[socketId: string]: Client;
}
// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- keep desktop's shape
export interface ClientBoolMap {
	[clientId: number]: boolean; // isTalking
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- keep desktop's shape
export interface AudioConnected {
	[peer: string]: boolean; // isConnected
}

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style -- keep desktop's shape
export interface numberStringMap {
	[index: number]: string;
}

export interface VoiceState {
	otherTalking: ClientBoolMap;
	playerSocketIds: numberStringMap;
	otherDead: ClientBoolMap;
	socketClients: SocketClientMap;
	audioConnected: AudioConnected;
	impostorRadioClientId: number;
	localTalking: boolean;
	localIsAlive: boolean;
	muted: boolean;
	deafened: boolean;
	mod: ModsType;
}
// --- end verbatim block ---

/** Mobile-only: the payload a desktop Mobile Host broadcasts to the `<lobbyCode>_mobile` room. */
export interface MobileData {
	gameState: AmongUsState;
	lobbySettings: ILobbySettings;
}
