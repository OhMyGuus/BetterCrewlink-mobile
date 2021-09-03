import { EventEmitter as EventEmitterO } from 'events';
import Peer from 'simple-peer';
import * as io from 'socket.io-client';
import { AmongUsState, GameState, Player, MobileData } from './AmongUsState';
import {
	SocketElementMap,
	SocketElement,
	Client,
	AudioElement,
	SocketClientMap,
	ILobbySettings,
	DEFAULT_LOBBYSETTINGS,
} from './smallInterfaces';
import { DEFAULT_ICE_CONFIG, DEFAULT_ICE_CONFIG_TURN } from './turnServers';
import { Injectable } from '@angular/core';
import AudioController from './AudioController.service';
import { SettingsService } from './settings.service';

export enum ConnectionState {
	disconnected = 0,
	connecting = 1,
	conencted = 2,
	error = 3,
}

export enum ConnectingStage {
	connectingToVoiceServer = 0,
	startingMicrophone = 1,
	searchingForHost = 2,
	waitingForHostToEnable = 3,
	WaitingForGameData = 4,
	waitingForYouToJoin = 5,
	parsingGameData = 6,
	FullyConnected = 7,
}

interface mobileHostInfo {
	mobileHostInfo: {
		isHostingMobile: boolean;
		isGameHost: boolean;
	};
}

export declare interface IConnectionController {
	currentGameState: AmongUsState;
	connectionState: ConnectionState;
	connectingStage: ConnectingStage;
	connect(voiceserver: string, gamecode: string, username: string, deviceID: string, natFix: boolean);
	on(event: 'onChange', listener: () => void): this;
}

@Injectable({
	providedIn: 'root',
})
export class ConnectionController extends EventEmitterO implements IConnectionController {
	socketIOClient: SocketIOClient.Socket;
	public currentGameState: AmongUsState;
	public oldGameState: AmongUsState;

	socketElements: SocketElementMap = new SocketElementMap();
	amongusUsername: string;
	currentGameCode: string;
	connectingStage = 0;
	connectionState = ConnectionState.disconnected;
	gamecode: string;
	lastPing: number = -1;
	localPLayer: Player;
	deviceID: string;
	public lobbySettings: ILobbySettings = DEFAULT_LOBBYSETTINGS;
	natFix: boolean = false;
	public audioController: AudioController;
	public mobileHosts: Map<string, mobileHostInfo> = new Map<string, mobileHostInfo>();
	private currentHost: string;
	private triedGameHost: boolean;
	private lastHostIndex = -1;
	public error: string | undefined;
	constructor(private settingsService: SettingsService) {
		super();
		this.audioController = new AudioController(this);
		this.ConnectionCheck();
	}

	updateConnectingStage(state: ConnectingStage) {
		if (this.connectingStage === state) {
			this.connectingStage += 1;
		}
		this.updateViews();
	}

	private ConnectionCheck() {
		const recievedDataLength = Date.now() - this.lastPing;
		if (this.connectionState !== ConnectionState.disconnected && this.lastPing !== -1 && recievedDataLength > 2000) {
			let index = 0;
			const nextIndex = this.mobileHosts.size > this.lastHostIndex ? this.lastHostIndex + 1 : 0;
			this.mobileHosts.forEach((mobiledata, from) => {
				if (mobiledata.mobileHostInfo.isGameHost || (this.triedGameHost && index++ === nextIndex)) {
					this.currentHost = from;
					this.lastHostIndex = this.triedGameHost ? nextIndex : -1;

					this.socketIOClient?.emit('signal', {
						to: from,
						data: { mobilePlayerInfo: { code: this.gamecode, askingForHost: true } },
					});
					this.updateConnectingStage(ConnectingStage.waitingForHostToEnable);
				}
			});
			this.triedGameHost = true;
		} else {
			this.triedGameHost = false;
		}
		setTimeout(() => this.ConnectionCheck(), 8000);
	}
	private getSocketElement(socketId: string): SocketElement {
		if (!this.socketElements.has(socketId)) {
			this.socketElements.set(socketId, new SocketElement(socketId));
		}
		return this.socketElements.get(socketId);
	}

	public getSocketElementByClientID(clientId: number): SocketElement | undefined {
		return Array.from(this.socketElements.values()).find((o) => o.client?.clientId === clientId);
	}

	getPlayer(clientId: number): Player {
		// cache clientid & socketid
		return this.currentGameState.players.find((o) => o.clientId === clientId);
	}

	connect(voiceserver: string, gamecode: string, username: string, deviceID: string, natFix: boolean) {
		console.log('Connect called??');
		this.socketElements.clear();
		this.lobbySettings = DEFAULT_LOBBYSETTINGS;
		this.connectingStage = 0;
		this.lastPing = Date.now();
		this.lastHostIndex = -1;
		this.connectionState = ConnectionState.connecting;
		this.gamecode = gamecode;
		this.amongusUsername = username;
		this.deviceID = deviceID;
		this.mobileHosts.clear();
		this.natFix = natFix;
		this.currentGameState = undefined;
		this.oldGameState = undefined;
		this.initialize(voiceserver);
	}

	disconnect(disconnectAudio: boolean) {
		if (this.connectionState === ConnectionState.disconnected) {
			return;
		}
		this.connectionState = ConnectionState.disconnected;
		this.gamecode = '';
		this.amongusUsername = '';
		this.socketIOClient?.emit('leave');
		this.socketIOClient?.disconnect();
		this.disconnectSockets();
		if (disconnectAudio) {
			this.audioController.disconnect();
		}
	}

	private disconnectElement(element: SocketElement) {
		console.log('disconnectElement!!!');
		if (!element) {
			return;
		}
		console.log('removing socket element form the list...');
		this.socketElements.delete(element.socketId);
		this.audioController.disconnectElement(element);
	}

	private disconnectSockets() {
		for (const element of this.socketElements.values()) {
			this.disconnectElement(element);
		}
	}

	// move to different controller
	private async startAudio() {
		this.socketIOClient.on('join', async (peerId: string, client: Client) => {
			console.log('[client.join]', { peerId, client });
			const elementByClient = this.getSocketElementByClientID(client.clientId);
			if (elementByClient) {
				this.disconnectElement(elementByClient);
			}
			const element = this.getSocketElement(peerId);
			element.client = client;
			this.ensurePeerConnection(element, true);
		});
	}

	private ensurePeerConnection(element: SocketElement, initiator: boolean) {
		if (!element.peer) {
			element.peer = this.createPeerConnection(element.socketId, this.audioController.stream, initiator);
		}
	}

	private updateViews() {
		this.emit('onChange');
	}

	private createPeerConnection(socketId: string, stream: MediaStream, initiator): Peer {
		console.log('[createPeerConnection1], ', { peerId: socketId });
		const peer: Peer = new Peer({
			stream,
			initiator, // @ts-ignore-line
			config: this.natFix ? DEFAULT_ICE_CONFIG_TURN : DEFAULT_ICE_CONFIG,
			objectMode: true,
		});
		peer.on('connect', () => {});

		peer.on('stream', (recievedDtream: MediaStream) => {
			console.log('stream recieved', { recievedDtream });
			const socketElement = this.getSocketElement(socketId);
			const audioElement = this.audioController.createAudioElement(recievedDtream, (bool: boolean) => {
				socketElement.talking = bool;
				this.emit('player_talk', socketElement.client?.clientId ?? -1, bool);
			});

			socketElement.audioElement = audioElement;
			console.log('ONSTREAM, ', socketElement, audioElement);
		});

		peer.on('signal', (data) => {
			this.socketIOClient.emit('signal', {
				data,
				to: socketId,
			});
		});

		peer.on('close', () => {
			console.log('PEER ON CLOSE?');
			const socketElement = this.getSocketElement(socketId);
			this.audioController.disconnectElement(socketElement);
		});

		peer.on('error', (err) => {
			console.log('PEER ON error? : ', err);
		});

		console.log(peer);
		console.log('peerConnections', this.socketElements);
		return peer;
	}

	private onLobbySettingsChange(settings: ILobbySettings) {
		let changed = false;

		Object.keys(this.lobbySettings).forEach((field: string) => {
			if (field in settings) {
				if (this.lobbySettings[field] !== settings[field]) {
					changed = true;
					this.lobbySettings[field] = settings[field];
				}
			}
		});
		if (changed) {
			this.socketElements.forEach((value) => {
				if (value.audioElement?.pan?.maxDistance) {
					value.audioElement.pan.maxDistance = this.lobbySettings.maxDistance;
				}
			});
		}
	}

	private muteAll() {
		this.socketElements.forEach((value) => {
			if (value?.audioElement?.gain) {
				value.audioElement.gain.gain.value = 0;
			}
		});
	}
	private onGameStateChange(amongUsState: AmongUsState) {
		try {
			console.log(this.socketElements);
			this.oldGameState = this.currentGameState;
			this.currentGameState = amongUsState;
			const newLocalplayer = amongUsState.players.filter(
				(o) => o.name.replace(' ', '') === this.amongusUsername.replace(' ', '')
			)[0];
			this.updateConnectingStage(ConnectingStage.WaitingForGameData);
			if (!newLocalplayer) {
				this.muteAll(); // if localplayer not found mute all players in lobby.
				return;
			} else {
				this.updateConnectingStage(ConnectingStage.waitingForYouToJoin);
			}

			if (
				this.connectionState === ConnectionState.conencted &&
				this.localPLayer &&
				(this.localPLayer.id !== newLocalplayer.id || this.localPLayer.clientId !== newLocalplayer.clientId)
			) {
				this.socketIOClient.emit('id', newLocalplayer.id, newLocalplayer.clientId);
			}

			this.localPLayer = newLocalplayer;

			if (this.connectionState === ConnectionState.connecting || this.currentGameCode !== this.gamecode) {
				this.currentGameCode = this.gamecode;
				console.log(this.localPLayer);
				this.startAudio().then(() => {
					this.socketIOClient.emit('join', this.gamecode, this.localPLayer.id, this.localPLayer.clientId);
					this.socketIOClient.emit('id', this.localPLayer.id, this.localPLayer.clientId);
				});
				this.updateConnectingStage(ConnectingStage.parsingGameData);
				this.connectionState = ConnectionState.conencted;
			}

			this.socketElements.forEach((value) => {
				if (value.client?.clientId === this.localPLayer?.clientId) {
					return;
				}

				value.updatePLayer(this);
				if (value.player) {
					value.player.isbetter = this.mobileHosts.has(value.socketId);
				}
				if (!value.settings && value.player) {
					value.settings = this.settingsService.getPlayerSettings(value.player?.nameHash);
				}

				if (value?.audioElement?.gain) {
					let endGain = this.audioController.updateAudioLocation(this.currentGameState, value, this.localPLayer);
					if (value.settings && endGain > 0) {
						endGain *= value.settings.volume / 100;
					}
					value.audioElement.gain.gain.value = endGain;
				}
			});
		} catch (e) {
			this.error = e.message;
			this.connectionState = ConnectionState.error;
		}
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
			if (this.connectionState !== ConnectionState.disconnected) {
				this.updateConnectingStage(ConnectingStage.connectingToVoiceServer);
				this.connectionState = ConnectionState.connecting; // resetting it to connecting since connection to voice server got reset;
				this.audioController.startAudio().then(() => {
					this.socketIOClient.emit('join', this.gamecode + '_mobile', Number(Date.now()), Number(Date.now()));
				});
			}
		});
		this.socketIOClient.on('disconnect', () => {
			console.log('[client.disconnect]');
		});

		this.socketIOClient.on('setClient', (socketId: string, client: Client) => {
			console.log('[client.setClient]', { socketId, client });
			const socketElement = this.getSocketElementByClientID(client.clientId);
			if (socketElement && socketElement.socketId !== socketId) {
				this.disconnectElement(socketElement);
			}
			this.getSocketElement(socketId).client = client;
		});

		this.socketIOClient.on('setClients', (clients: SocketClientMap) => {
			console.log('[client.setClients]', { clients });
			for (const socketId of Object.keys(clients)) {
				const socketElement = this.getSocketElementByClientID(clients[socketId].clientId);
				if (socketElement && socketElement.socketId !== socketId) {
					this.disconnectElement(socketElement);
				} else {
					this.getSocketElement(socketId).client = clients[socketId];
				}
			}
		});

		this.socketIOClient.on('VAD', (data: { activity: boolean; client: Client; socketId: string }) => {
			let socketElement = this.getSocketElementByClientID(data.client.clientId);
			if (socketElement) {
				socketElement.talking = data.activity;
				this.emit('player_talk', socketElement.client?.clientId ?? -1, data.activity);
			}
		});

		this.socketIOClient.on('signal', ({ data, from }: { data: any; from: string }) => {
			if (data.hasOwnProperty('mobileHostInfo')) {
				const mobiledata = data as mobileHostInfo;
				this.mobileHosts.set(from, mobiledata);
				this.updateConnectingStage(ConnectingStage.searchingForHost);
				return;
			}

			if (data.hasOwnProperty('gameState')) {
				this.lastPing = Date.now();
				this.updateConnectingStage(ConnectingStage.waitingForHostToEnable);
				const mobiledata = data as MobileData;
				this.onLobbySettingsChange(mobiledata.lobbySettings);
				this.onGameStateChange(mobiledata.gameState);
				return;
			}

			if (!this.audioController.stream) {
				return;
			}
			const socketElement = this.getSocketElement(from);
			this.ensurePeerConnection(socketElement, false);
			socketElement.peer.signal(data);
		});
	}
}
