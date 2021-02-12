import { ILobbySettings } from './smallInterfaces';

export interface MobileData {
	gameState: AmongUsState;
	lobbySettings: ILobbySettings;
}

export interface AmongUsState {
	gameState: GameState;
	oldGameState: GameState;
	lobbyCode: string;
	players: Player[];
	isHost: boolean;
	clientId: number;
	hostId: number;
	comsSabotaged: boolean;
}

export interface Player {
	ptr: number;
	id: number;
	clientId: number;
	name: string;
	colorId: number;
	hatId: number;
	petId: number;
	skinId: number;
	disconnected: boolean;
	isImpostor: boolean;
	isDead: boolean;
	taskPtr: number;
	objectPtr: number;
	isLocal: boolean;
	nameHash: number;
	x: number;
	y: number;
	inVent: boolean;
	isbetter: boolean;
}

export enum GameState {
	LOBBY,
	TASKS,
	DISCUSSION,
	MENU,
	UNKNOWN,
}
