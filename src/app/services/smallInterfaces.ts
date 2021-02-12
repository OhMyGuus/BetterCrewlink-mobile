import Peer from 'simple-peer';
import { Player, GameState } from './AmongUsState';
import { ConnectionController } from './ConnectionController.service';

export enum VoiceServerOption {
	ORIGINALCREWLINK = 0,
	BETTERCREWLINK = 1,
	CUSTOM = 2,
}
export interface playerSetting {
	volume: number;
}

export interface ISettings {
	voiceServerOption: VoiceServerOption;
	customVoiceServer: string;
	username: string;
	gamecode: string;
	selectedMicrophone: IDeviceInfo;
	natFix: boolean;
	playerSettings: PlayerSettingsMap;
}

export interface Client {
	playerId: number;
	clientId: number;
}

export interface SocketClientMap {
	[socketId: string]: Client;
}

export interface IDeviceInfo {
	kind: string;
	label: string;
	deviceId: string;
	id: number;
}

export interface AudioElement {
	htmlAudioElement: HTMLAudioElement;
	audioContext: AudioContext;
	mediaStreamAudioSource: MediaStreamAudioSourceNode;
	gain: GainNode;
	pan: PannerNode;
	muffle: BiquadFilterNode;
	// reverb: ConvolverNode;
	destination: AudioNode;
	// reverbConnected: boolean;
	muffleConnected: boolean;
}

export interface ILobbySettings {
	maxDistance: number;
	haunting: boolean;
	hearImpostorsInVents: boolean;
	impostersHearImpostersInvent: boolean;
	commsSabotage: boolean;
	deadOnly: boolean;
	meetingGhostOnly: boolean;
	hearThroughCameras: boolean;
	wallsBlockAudio: boolean;
}

export const DEFAULT_LOBBYSETTINGS: ILobbySettings = {
	maxDistance: 5.32,
	haunting: false,
	hearImpostorsInVents: false,
	impostersHearImpostersInvent: false,
	commsSabotage: false,
	deadOnly: false,
	hearThroughCameras: false,
	wallsBlockAudio: false,
	meetingGhostOnly: false,
};

export class SocketElement {
	socketId: string;
	peer?: Peer;
	client?: Client;
	audioElement?: AudioElement;
	player?: Player;
	talking: boolean = false;
	isDead: boolean;
	settings: playerSetting | undefined;
	constructor(socketId: string, peer?: Peer, client?: Client, audioElement?: AudioElement, player?: Player) {
		this.socketId = socketId;
		this.peer = peer;
		this.client = client;
		this.audioElement = audioElement;
		this.player = player;
	}

	updatePLayer(connectionController: ConnectionController) {
		this.player = this.client ? connectionController.getPlayer(this.client?.clientId) : undefined;
		if (this.isDead && !this.player?.isDead) {
			this.isDead = false;
		} else if (
			this.player?.isDead &&
			(connectionController.localPLayer.isDead ||
				connectionController.oldGameState?.gameState === GameState.DISCUSSION ||
				connectionController.oldGameState.gameState === GameState.LOBBY)
		) {
			this.isDead = true;
		}
	}
}

export class SocketElementMap extends Map<string, SocketElement> {}

export class PlayerSettingsMap extends Map<number, playerSetting> {}
