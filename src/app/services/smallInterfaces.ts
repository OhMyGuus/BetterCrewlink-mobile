export enum VoiceServerOption {
	ORIGINALCREWLINK = 0,
	BETTERCREWLINK = 1,
	CUSTOM = 2,
}
export interface PlayerSetting {
	volume: number;
	isMuted: boolean;
}

/**
 * Replicates desktop's per-player presence indicator (Avatar's `connectionState`):
 * - `disconnected`: the player has no client on the voice server at all (Wi-Fi off icon).
 * - `novoice`: the player is on the voice server but no audio peer/stream is established (link off icon).
 * - `connected`: the player's voice connection is fully up (no badge).
 */
export type PlayerConnectionState = 'connected' | 'novoice' | 'disconnected';

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
