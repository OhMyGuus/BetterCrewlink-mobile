import { EventEmitter as EventEmitterO } from 'events';
import { promise } from 'protractor';
import Peer from 'simple-peer';
import * as io from 'socket.io-client';
import { AmongUsState, GameState, Player } from './AmongUsState';

const DEFAULT_ICE_CONFIG: RTCConfiguration = {
	iceServers: [
		{
			urls: 'stun:stun.l.google.com:19302',
		},
	],
};

export declare interface IConnectionController {
	currentGameState: AmongUsState;
	joined: boolean;
}

declare interface ConnectionController {
	on(event: 'onstream', listener: (e: MediaStream) => void): this;
	on(event: 'gamestateChange', listener: (e: AmongUsState) => void): this;
}

interface AudioElement {
	htmlAudioElement: HTMLAudioElement;
	audioContext: AudioContext;
	mediaStreamAudioSource: MediaStreamAudioSourceNode;
	gain: GainNode;
	pan: PannerNode;
	compressor: DynamicsCompressorNode;
}

interface SocketElement {
	socketId: string;
	peer?: Peer;
	client?: Client;
	audioElement?: AudioElement;
}

interface SocketElementMap {
	[socketId: string]: SocketElement;
}

class ConnectionController extends EventEmitterO implements IConnectionController {
	socketIOClient: SocketIOClient.Socket;
	public currentGameState: AmongUsState;
	peerConnections: SocketElementMap = {};
	amongusUsername: string;
	currenGameCode: string;
	gamecode: string;
	public joined: boolean;
	myPlayer: Player;
	stream: MediaStream;
	deviceID: string;

	private getSocketElement(socketId: string): SocketElement {
		if (!this.peerConnections[socketId]) {
			this.peerConnections[socketId] = { socketId };
		}
		return this.peerConnections[socketId];
	}

	private getPlayer(clientId: number): Player {
		return this.currentGameState.players.find((o) => o.clientId === clientId);
	}

	connect(gamecode: string, username: string, deviceID: string) {
		this.gamecode = gamecode;
		this.amongusUsername = username;
		this.deviceID = deviceID;
		console.log('deviceID: ', deviceID);
		this.initialize('https://bettercrewl.ink:6524');
		this.socketIOClient.emit('mobileJoin', this.gamecode);
	}

	disconnect() {
		this.gamecode = '';
		this.amongusUsername = '';
		this.socketIOClient.emit('leave');
		this.socketIOClient.disconnect();
		this.joined = false;
		this.disconnectSockets();
	}

	private disconnectSockets() {
		for (const element of Object.values(this.peerConnections)) {
			element?.audioElement?.compressor?.disconnect();
			element?.audioElement?.pan?.disconnect();
			element?.audioElement?.gain?.disconnect();
			element?.audioElement?.mediaStreamAudioSource?.disconnect();
			element?.audioElement?.audioContext?.close();
			element?.audioElement?.htmlAudioElement.remove();
			this.stream.getTracks().forEach((track) => track.stop());
			this.peerConnections[element.socketId] = undefined;
		}
	}
	private async startAudio() {
		const audio: MediaTrackConstraintSet = {
			deviceId: this.deviceID,
			autoGainControl: false,
			echoCancellation: true,
			latency: 0,
			noiseSuppression: true,
		};

		this.stream = await navigator.mediaDevices.getUserMedia({ video: false, audio });

		console.log('connected to microphone');

		this.socketIOClient.on('join', async (peerId: string, client: Client) => {
			console.log('[client.join]', { peerId, client });
			this.createPeerConnection(peerId, this.stream, true);
		});

		this.socketIOClient.on('signal', ({ data, from }: { data: Peer.SignalData; from: string }) => {
			console.log('signal');
			const socketElement = this.getSocketElement(from);

			if (!socketElement.peer) {
				socketElement.peer = this.createPeerConnection(from, this.stream, false);
			}
			console.log(socketElement.peer);
			socketElement.peer.signal(data);
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
			this.getSocketElement(peerId).audioElement = this.createAudioElement(recievedDtream);
			console.log(this.getSocketElement(peerId).audioElement);
		});

		peer.on('signal', (data) => {
			this.socketIOClient.emit('signal', {
				data,
				to: peerId,
			});
		});

		console.log('peerConnections', this.peerConnections);
		return peer;
	}

	private createAudioElement(stream: MediaStream): AudioElement {
		console.log('[createAudioElement]');
		const htmlAudioElement = document.createElement('audio');
		document.body.appendChild(htmlAudioElement);
		htmlAudioElement.srcObject = stream;

		const context = new AudioContext();
		const source = context.createMediaStreamSource(stream);
		const gain = context.createGain();
		const pan = context.createPanner();
		const compressor = context.createDynamicsCompressor();

		pan.refDistance = 0.1;
		pan.panningModel = 'equalpower';
		pan.distanceModel = 'linear';
		pan.maxDistance = 5;
		pan.rolloffFactor = 1;

		source.connect(pan);
		pan.connect(gain);
		gain.connect(compressor);
		gain.gain.value = 1;
		htmlAudioElement.volume = 1;
		const audioContext = pan.context;
		const panPos = [3, 0];
		pan.positionZ.setValueAtTime(-0.5, audioContext.currentTime);
		pan.positionX.setValueAtTime(panPos[0], audioContext.currentTime);
		pan.positionY.setValueAtTime(panPos[1], audioContext.currentTime);
		compressor.connect(context.destination);

		return {
			htmlAudioElement,
			audioContext: context,
			mediaStreamAudioSource: source,
			gain,
			pan,
			compressor,
		};
	}

	private updateAudioLocation() {
		console.log(this.peerConnections);
		for (const element of Object.values(this.peerConnections)) {
			console.log('updateAudioLocation ->', { element });
			if (!element.audioElement || !element.client) {
				continue;
			}
			console.log('[updateAudioLocation]');
			const pan = element.audioElement.pan;
			const audioContext = pan.context;
			pan.positionZ.setValueAtTime(-0.5, audioContext.currentTime);
			const other = this.getPlayer(element.client?.clientId);
			const panPos = [other.x - this.myPlayer.x, other.y - this.myPlayer.y];
			pan.positionX.setValueAtTime(panPos[0], audioContext.currentTime);
			pan.positionY.setValueAtTime(panPos[1], audioContext.currentTime);
		}
	}

	private onGameStateChange(amongUsState: AmongUsState) {
		this.myPlayer = amongUsState.players.filter((o) => o.name === this.amongusUsername)[0];
		if (!this.myPlayer) {
			return;
		}

		if (!this.joined || this.currenGameCode !== this.gamecode) {
			this.currenGameCode = this.gamecode;
			console.log(this.myPlayer);
			this.startAudio().then(() => {
				this.socketIOClient.emit('id', this.myPlayer.id, this.myPlayer.clientId);
				this.socketIOClient.emit('join', this.gamecode, this.myPlayer.id, this.myPlayer.clientId);
			});
			this.joined = true;
		}
		this.updateAudioLocation();
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

		this.socketIOClient.on('mobileAmongUsState', (amongUsState: AmongUsState) => {
			this.currentGameState = amongUsState;
			this.emit('gamestateChange', amongUsState);
			this.onGameStateChange(amongUsState);
		});
	}
}

export const connectionController = new ConnectionController();
