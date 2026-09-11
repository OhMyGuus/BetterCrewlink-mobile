export enum VoiceServerOption {
	ORIGINALCREWLINK = 0,
	BETTERCREWLINK = 1,
	CUSTOM = 2,
}
export interface PlayerSetting {
	volume: number;
	isMuted: boolean;
}

export interface Client {
	playerId: number;
	clientId: number;
}

export type SocketClientMap = Record<string, Client>;

export interface IDeviceInfo {
	kind: string;
	label: string;
	deviceId: string;
	id: number;
}

export class PlayerSettingsMap extends Map<number, PlayerSetting> {}
