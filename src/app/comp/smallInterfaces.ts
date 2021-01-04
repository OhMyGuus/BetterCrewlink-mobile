import Peer from 'simple-peer';
import { Player } from './AmongUsState';
import { connectionController } from './ConnectionController';

export interface ISettings {
	voiceServer: string;
	username: string;
	gamecode: string;
	selectedMicrophone: string;
}

export interface Client {
	playerId: number;
	clientId: number;
}

export interface SocketObject {
	htmlElement: HTMLAudioElement;
	client: Client;
}

export interface SocketClientMap {
	[socketId: string]: Client;
}

export interface IDeviceInfo {
	label: string;
	deviceId: string;
}

export interface AudioElement {
	htmlAudioElement: HTMLAudioElement;
	audioContext: AudioContext;
	mediaStreamAudioSource: MediaStreamAudioSourceNode;
	gain: GainNode;
	pan: PannerNode;
	compressor: DynamicsCompressorNode;
}

export class SocketElement {
	socketId: string;
	peer?: Peer;
	client?: Client;
	audioElement?: AudioElement;
	player?: Player;

	constructor(socketId: string, peer?: Peer, client?: Client, audioElement?: AudioElement, player?: Player) {
		this.socketId = socketId;
		this.peer = peer;
		this.client = client;
		this.audioElement = audioElement;
		this.player = player;
	}

	updatePLayer() {
		this.player = this.client ? connectionController.getPlayer(this.client?.clientId) : undefined;
	}
}

export class SocketElementMap extends Map<string, SocketElement> {}
