import { EventEmitter as EventEmitterO } from 'events';
import { promise } from 'protractor';
import Peer from 'simple-peer';
import * as io from 'socket.io-client';
import { AmongUsState, GameState, Player } from './AmongUsState';
import { SocketElementMap, SocketElement, Client, AudioElement, SocketClientMap } from './smallInterfaces';
import { audioController } from './AudioController';

const DEFAULT_ICE_CONFIG: RTCConfiguration = {
	iceServers: [
		{
			urls: 'stun:stun.l.google.com:19302',
		},
	],
};

export enum ConnectionState {
	disconnected = 0,
	connecting = 1,
	conencted = 2,
}

export declare interface IConnectionController {
	currentGameState: AmongUsState;
	connectionState: ConnectionState;
}

declare interface ConnectionController {
	on(event: 'onstream', listener: (e: MediaStream) => void): this;
	on(event: 'gamestateChange', listener: (e: AmongUsState) => void): this;
}

class ConnectionController extends EventEmitterO implements IConnectionController {
	socketIOClient: SocketIOClient.Socket;
	public currentGameState: AmongUsState;
	socketElements: SocketElementMap = new SocketElementMap();
	amongusUsername: string;
	currenGameCode: string;
	public connectionState = ConnectionState.disconnected;
	gamecode: string;
	localPLayer: Player;
	deviceID: string;

	private getSocketElement(socketId: string): SocketElement {
		if (!this.socketElements.has(socketId)) {
			this.socketElements.set(socketId, new SocketElement(socketId));
		}

		return this.socketElements.get(socketId);
	}

	getPlayer(clientId: number): Player {
		// cache clientid & socketid
		return this.currentGameState.players.find((o) => o.clientId === clientId);
	}

	connect(voiceserver: string, gamecode: string, username: string, deviceID: string) {
		this.connectionState = ConnectionState.connecting;
		this.gamecode = gamecode;
		this.amongusUsername = username;
		this.deviceID = deviceID;
		console.log('deviceID: ', deviceID);
		this.initialize(voiceserver);
		this.socketIOClient.emit('join', this.gamecode + '_mobile', Number(Date.now()), Number(Date.now()));
	}

	disconnect() {
		this.connectionState = ConnectionState.disconnected;
		this.gamecode = '';
		this.amongusUsername = '';
		this.socketIOClient.emit('leave');
		this.socketIOClient.disconnect();
		this.disconnectSockets();
		audioController.disconnect(this.socketElements);
	}

	private disconnectSockets() {
		for (const element of Object.values(this.socketElements)) {
			element?.audioElement?.compressor?.disconnect();
			element?.audioElement?.pan?.disconnect();
			element?.audioElement?.gain?.disconnect();
			element?.audioElement?.mediaStreamAudioSource?.disconnect();
			element?.audioElement?.audioContext?.close();
			element?.audioElement?.htmlAudioElement.remove();
			this.socketElements[element.socketId] = undefined;
		}
	}

	// move to different controller
	private async startAudio() {
		await audioController.startAudio();

		this.socketIOClient.on('join', async (peerId: string, client: Client) => {
			console.log('[client.join]', { peerId, client });
			this.createPeerConnection(peerId, audioController.stream, true);
		});
	}

	private createPeerConnection(peerId: string, stream: MediaStream, initiator): Peer {
		console.log('[createPeerConnection], ', { peerId });
		const peer = new Peer({
			stream,
			initiator, // @ts-ignore-line
			iceRestartEnabled: true,
			config: DEFAULT_ICE_CONFIG,
		});

		peer.on('stream', (recievedDtream: MediaStream) => {
			this.emit('onstream', recievedDtream);
			console.log('stream recieved', { recievedDtream });
			this.getSocketElement(peerId).audioElement = audioController.createAudioElement(recievedDtream);
			console.log(this.getSocketElement(peerId).audioElement);
		});

		peer.on('signal', (data) => {
			this.socketIOClient.emit('signal', {
				data,
				to: peerId,
			});
		});

		console.log('peerConnections', this.socketElements);
		return peer;
	}

	private onGameStateChange(amongUsState: AmongUsState) {
		this.currentGameState = amongUsState;
		this.localPLayer = amongUsState.players.filter((o) => o.name === this.amongusUsername)[0];
		if (!this.localPLayer) {
			return;
		}

		if (this.connectionState === ConnectionState.connecting || this.currenGameCode !== this.gamecode) {
			this.currenGameCode = this.gamecode;
			console.log(this.localPLayer);
			this.startAudio().then(() => {
				this.socketIOClient.emit('id', this.localPLayer.id, this.localPLayer.clientId);
				this.socketIOClient.emit('join', this.gamecode, this.localPLayer.id, this.localPLayer.clientId);
			});
			this.connectionState = ConnectionState.conencted;
		}

		this.socketElements.forEach((value) => {
			value.updatePLayer();
			audioController.updateAudioLocation(this.currentGameState, value, this.localPLayer);
		});
	}

	private initialize(serverUrl: string) {
		this.socketIOClient?.disconnect();
		console.log('[Connect] got called');
		this.socketIOClient = io(serverUrl, {
			transports: ['websocket'],
		});

		this.socketIOClient.on('error', (error: string) => {
			console.log('[client.error', error);
		});
		this.socketIOClient.on('connect', () => {
			console.log('[client.connect]');
		});
		this.socketIOClient.on('disconnect', () => {
			console.log('[client.disconnect]');
		});

		this.socketIOClient.on('setClient', (socketId: string, client: Client) => {
			this.getSocketElement(socketId).client = client;
			console.log('[client.setClient]', { socketId, client });
		});

		this.socketIOClient.on('setClients', (clients: SocketClientMap) => {
			console.log('[client.setClients]', { clients });
			for (const socketId of Object.keys(clients)) {
				this.getSocketElement(socketId).client = clients[socketId];
			}
		});

		this.socketIOClient.on('signal', ({ data, from }: { data: any; from: string }) => {
			if (data.hasOwnProperty('gameState')) {
				console.log('gamestateupdate?');
				this.onGameStateChange(data as AmongUsState);
				return;
			}

			if (!audioController.stream) {
				return;
			}
			const socketElement = this.getSocketElement(from);

			if (!socketElement.peer) {
				socketElement.peer = this.createPeerConnection(from, audioController.stream, false);
			}
			socketElement.peer.signal(data);
		});
	}
}

export const connectionController = new ConnectionController();
