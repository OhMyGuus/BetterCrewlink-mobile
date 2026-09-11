import { EventEmitter as EventEmitterO } from 'events';
import { io, Socket } from 'socket.io-client';
import { AmongUsState, MobileData, numberStringMap, Player } from '../common/AmongUsState';
import { ILobbySettings } from '../common/ISettings';
import { Client, SocketClientMap } from './smallInterfaces';
import { DEFAULT_ICE_CONFIG, DEFAULT_ICE_CONFIG_TURN, ClientPeerConfig, defaultLobbySettings } from '../voice/types';
import PeerConnection, { SignalData } from '../lib/PeerConnection';
import { validateClientPeerConfig } from '../lib/validateClientPeerConfig';
import { Injectable } from '@angular/core';
import AudioController from './AudioController.service';
import { SettingsService } from './settings.service';
import { GameInfo } from '../common/GameInfo';
import { environment } from '../../environments/environment';

// Ported from bettercrewlink (desktop) v3.2.1 src/renderer/voice/ConnectionController.ts.
const ICE_DISCONNECT_TIMEOUT_MS = 12000;
const PEER_CONNECT_TIMEOUT_MS = 30000;
const PEER_RETRY_DELAY_MS = 1000;
const MAX_PEER_RETRY_DELAY_MS = 15000;

function isRelayUrl(urls: RTCIceServer['urls']): boolean {
	return ([] as string[]).concat(urls).some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
}

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

export declare interface IConnectionController {
	currentGameState: AmongUsState;
	connectionState: ConnectionState;
	connectingStage: ConnectingStage;
	connect(voiceserver: string, gamecode: string, username: string, deviceID: string, natFix: boolean);
}

/**
 * Transport layer only: the socket connection, the peer-connection lifecycle (Phase 3's
 * timers/retry/glare machinery), and the small set of state fields (`currentGameState`,
 * `localPLayer`, `lobbySettings`, ...) other services read and write. Game-state processing,
 * per-player audio, and impostor radio live in VoiceController, which subscribes to the
 * `hostUpdate`/`peerData`/`player_talk` events this class emits - mirroring desktop's
 * ConnectionController/VoiceController split.
 */
@Injectable({
	providedIn: 'root',
})
export class ConnectionController implements IConnectionController {
	socketIOClient: Socket;
	public currentGameState: AmongUsState;
	public oldGameState: AmongUsState;

	private clients: SocketClientMap = {};
	private peers = new Map<string, PeerConnection>();
	private peerConnectionIds = new Map<string, string>();
	private peerOffers = new Map<string, string>();
	private iceDisconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerConnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
	private peerRetryAttempts = new Map<string, number>();
	private iceConfig: RTCConfiguration = DEFAULT_ICE_CONFIG;

	amongusUsername: string;
	currentGameCode: string;
	connectingStage = 0;
	connectionState = ConnectionState.disconnected;
	gamecode: string;
	lastPing = -1;
	localPLayer: Player;
	deviceID: string;
	public lobbySettings: ILobbySettings = { ...defaultLobbySettings };
	natFix = false;
	public audioController: AudioController;
	/** Written by MobileHostService; read here to filter game-state frames to the selected host. */
	public currentHost: string | undefined;
	public error: string | undefined;
	public events = new EventEmitterO();
	constructor(private settingsService: SettingsService) {
		this.audioController = new AudioController(this, settingsService);
	}

	/**
	 * Mobile's gameinfo payload. Mirrors desktop's sendGameInfo, but the game-side fields are
	 * unknowable without Among Us process access, so they stay at defaults; appVersion is our
	 * own version and platform is 'mobile' inside an APK or 'web' in a browser build.
	 */
	private buildGameInfo(): GameInfo {
		return {
			appVersion: environment.appVersion,
			broadcastVersion: -1,
			offsetsVersion: -1,
			is64bit: false,
			platform: this.settingsService.IsMobile ? 'mobile' : 'web',
			mod: 'NONE',
			mods: [],
		};
	}

	public sendGameInfo(gameInfo: GameInfo): void {
		this.socketIOClient?.emit('gameinfo', gameInfo);
	}

	updateConnectingStage(state: ConnectingStage) {
		if (this.connectingStage === state) {
			this.connectingStage += 1;
		}
		this.updateViews();
	}

	public getClient(socketId: string): Client | undefined {
		return this.clients[socketId];
	}

	get playerSocketIds(): numberStringMap {
		const map: numberStringMap = {};
		for (const socketId of Object.keys(this.clients)) {
			map[this.clients[socketId].clientId] = socketId;
		}
		return map;
	}

	getPlayer(clientId: number): Player {
		// cache clientid & socketid
		return this.currentGameState.players.find((o) => o.clientId === clientId);
	}

	connect(voiceserver: string, gamecode: string, username: string, deviceID: string, natFix: boolean) {
		console.log('Connect called??');
		this.destroyAllPeers();
		this.clients = {};
		this.lobbySettings = { ...defaultLobbySettings };
		this.connectingStage = 0;
		this.lastPing = Date.now();
		this.connectionState = ConnectionState.connecting;
		this.gamecode = gamecode;
		this.amongusUsername = username;
		this.deviceID = deviceID;
		this.currentHost = undefined;
		this.natFix = natFix;
		this.currentGameState = undefined;
		this.oldGameState = undefined;
		this.error = undefined;
		this.events.emit('connecting');
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
		this.destroyAllPeers();
		this.clients = {};
		if (disconnectAudio) {
			this.audioController.disconnect();
		}
	}

	private clearPeerTimer(timers: Map<string, ReturnType<typeof setTimeout>>, socketId: string): void {
		const timer = timers.get(socketId);
		if (timer !== undefined) clearTimeout(timer);
		timers.delete(socketId);
	}

	private destroyPeer(socketId: string): void {
		this.clearPeerTimer(this.iceDisconnectTimers, socketId);
		this.clearPeerTimer(this.peerConnectTimers, socketId);
		this.clearPeerTimer(this.peerRetryTimers, socketId);
		this.peerConnectionIds.delete(socketId);
		this.peerOffers.delete(socketId);

		const connection = this.peers.get(socketId);
		if (!connection) return;

		// Remove ownership before close callbacks can run.
		this.peers.delete(socketId);
		connection.destroy();
		this.audioController.removePeer(socketId);
	}

	private disconnectPeer(socketId: string): void {
		this.destroyPeer(socketId);
		this.peerRetryAttempts.delete(socketId);
	}

	private destroyAllPeers(): void {
		for (const socketId of new Set([...this.peers.keys(), ...this.peerRetryTimers.keys()])) {
			this.disconnectPeer(socketId);
		}
	}

	private canReconnectPeer(socketId: string): boolean {
		return Boolean(
			this.connectionState !== ConnectionState.disconnected &&
				this.audioController.stream &&
				this.socketIOClient?.connected &&
				this.socketIOClient.id !== socketId &&
				this.gamecode &&
				this.clients[socketId]
		);
	}

	private retryPeer(socketId: string, connection: PeerConnection, reason: string): void {
		if (this.peers.get(socketId) !== connection) return;
		this.destroyPeer(socketId);
		if (!this.canReconnectPeer(socketId)) {
			this.peerRetryAttempts.delete(socketId);
			return;
		}

		const attempt = this.peerRetryAttempts.get(socketId) ?? 0;
		const delay = Math.min(PEER_RETRY_DELAY_MS * 2 ** Math.min(attempt, 4), MAX_PEER_RETRY_DELAY_MS);
		this.peerRetryAttempts.set(socketId, attempt + 1);
		console.warn('Reconnecting peer', socketId, 'in', delay, 'ms:', reason);
		this.peerRetryTimers.set(
			socketId,
			setTimeout(() => {
				this.peerRetryTimers.delete(socketId);
				if (!this.canReconnectPeer(socketId) || this.peers.has(socketId)) return;
				this.createPeerConnection(socketId, true, this.clients[socketId]);
			}, delay)
		);
	}

	/** Replaces the incoming client list, disconnecting any peer/timer no longer present in it. */
	private setClients(clients: SocketClientMap): void {
		this.clients = clients;
		for (const socketId of new Set([...this.peers.keys(), ...this.peerRetryTimers.keys()])) {
			if (!clients[socketId]) {
				this.disconnectPeer(socketId);
			}
		}
		this.updateViews();
	}

	private updateViews() {
		this.events.emit('onChange');
	}

	/** Sends a JSON payload to specific connected peers (used for impostor radio messages). */
	public sendToPeers(peerIds: string[], payload: string): void {
		for (const peerId of peerIds) {
			const peer = this.peers.get(peerId);
			if (peer?.writable) peer.send(payload);
		}
	}

	/** Starts listening for peer joins and announces us to the real lobby room, once the local player is known. */
	public joinGameRoom(
		playerId: number,
		clientId: number,
		friendCode = '',
		playerUid = '',
		playerIdentifier = ''
	): void {
		this.startAudio().then(() => {
			this.socketIOClient.emit('join', this.gamecode, playerId, clientId);
			this.emitId(playerId, clientId, friendCode, playerUid, playerIdentifier);
		});
	}

	/**
	 * (Re-)claims our Among Us account identity with the voice server - desktop's `emitId`.
	 * 3.2.0+ servers read friendCode/playerUid/playerIdentifier off `id` for account bans and
	 * spoof detection, and other clients use them to key per-player settings by account rather
	 * than by display name. Omitting them makes the server treat us as a pre-3.2.0 client.
	 */
	public emitId(playerId: number, clientId: number, friendCode = '', playerUid = '', playerIdentifier = ''): void {
		this.socketIOClient?.emit('id', playerId, clientId, friendCode, playerUid, playerIdentifier);
	}

	private createPeerConnection(
		socketId: string,
		initiator: boolean,
		client: Client,
		connectionId: string | undefined = initiator ? crypto.randomUUID() : undefined
	): PeerConnection {
		this.destroyPeer(socketId);
		// A player refreshing gets a new socket ID. Retire the old socket's retries too.
		const clients = { ...this.clients };
		for (const [otherSocketId, otherClient] of Object.entries(this.clients)) {
			if (otherSocketId !== socketId && otherClient.clientId === client.clientId) {
				delete clients[otherSocketId];
			}
		}
		this.setClients({ ...clients, [socketId]: client });

		const config = this.natFix ? DEFAULT_ICE_CONFIG_TURN : this.iceConfig;
		const connection = new PeerConnection({
			stream: this.audioController.stream,
			initiator,
			config,
		});
		this.peers.set(socketId, connection);
		if (connectionId !== undefined) this.peerConnectionIds.set(socketId, connectionId);
		this.peerConnectTimers.set(
			socketId,
			setTimeout(() => this.retryPeer(socketId, connection, 'connection timed out'), PEER_CONNECT_TIMEOUT_MS)
		);

		connection.on('connect', () => {
			if (this.peers.get(socketId) !== connection) return;
			this.clearPeerTimer(this.peerConnectTimers, socketId);
			this.clearPeerTimer(this.iceDisconnectTimers, socketId);
			this.peerRetryAttempts.delete(socketId);
		});

		connection.on('iceStateChange', (iceState: RTCIceConnectionState) => {
			if (this.peers.get(socketId) !== connection) return;
			if (iceState === 'failed' || iceState === 'closed') {
				this.retryPeer(socketId, connection, `ICE ${iceState}`);
				return;
			}
			if (iceState === 'connected' || iceState === 'completed') {
				this.clearPeerTimer(this.iceDisconnectTimers, socketId);
				return;
			}

			if (iceState === 'disconnected' && !this.iceDisconnectTimers.has(socketId)) {
				this.iceDisconnectTimers.set(
					socketId,
					setTimeout(() => this.retryPeer(socketId, connection, 'ICE stayed disconnected'), ICE_DISCONNECT_TIMEOUT_MS)
				);
			}
		});

		connection.on('stream', (stream: MediaStream) => {
			if (this.peers.get(socketId) !== connection) return;
			this.audioController.addPeer(socketId, stream);
		});

		connection.on('signal', (data) => {
			if (this.peers.get(socketId) !== connection || !this.socketIOClient?.connected) return;
			this.socketIOClient.emit('signal', { data: { ...data, connectionId }, to: socketId });
		});

		connection.on('data', (data) => {
			if (this.peers.get(socketId) !== connection) return;
			try {
				this.events.emit('peerData', socketId, JSON.parse(data) as Record<string, unknown>);
			} catch (error) {
				console.warn('Failed to parse peer data', error);
			}
		});

		connection.on('close', () => this.retryPeer(socketId, connection, 'connection closed'));

		connection.on('error', (error) => {
			this.retryPeer(socketId, connection, error.message);
		});

		return connection;
	}

	private async startAudio() {
		this.socketIOClient.on('join', (socketId: string, client: Client) => {
			console.log('[client.join]', { socketId, client });
			this.setClients({ ...this.clients, [socketId]: client });
			if (!this.canReconnectPeer(socketId) || this.peers.has(socketId) || this.peerRetryTimers.has(socketId)) {
				return;
			}
			this.createPeerConnection(socketId, true, client);
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
			if (this.connectionState !== ConnectionState.disconnected) {
				this.updateConnectingStage(ConnectingStage.connectingToVoiceServer);
				this.connectionState = ConnectionState.connecting; // resetting it to connecting since connection to voice server got reset;
				this.audioController.startAudio().then(() => {
					this.socketIOClient.emit('join', this.gamecode + '_mobile', Number(Date.now()), Number(Date.now()));
					this.sendGameInfo(this.buildGameInfo());
				});
			}
		});
		this.socketIOClient.on('disconnect', () => {
			console.log('[client.disconnect]');
			this.destroyAllPeers();
			this.setClients({});
		});

		this.socketIOClient.on('clientPeerConfig', (clientPeerConfig: ClientPeerConfig) => {
			if (!validateClientPeerConfig(clientPeerConfig)) {
				const errorsFormatted = (validateClientPeerConfig.errors ?? [])
					.map((error) => error.instancePath + ' ' + error.message)
					.join('\n');
				console.warn(
					`Server sent a malformed peer config. Default config will be used. See errors below:\n${errorsFormatted}`
				);
				return;
			}

			if (clientPeerConfig.forceRelayOnly && !clientPeerConfig.iceServers.some((server) => isRelayUrl(server.urls))) {
				console.warn('Server has forced relay mode enabled but provides no relay servers. Default config will be used.');
				return;
			}

			this.iceConfig = {
				iceTransportPolicy: clientPeerConfig.forceRelayOnly ? 'relay' : 'all',
				iceServers: clientPeerConfig.iceServers,
			};
		});

		this.socketIOClient.on('setClient', (socketId: string, client: Client) => {
			console.log('[client.setClient]', { socketId, client });
			this.setClients({ ...this.clients, [socketId]: client });
		});

		this.socketIOClient.on('setClients', (clients: SocketClientMap) => {
			console.log('[client.setClients]', { clients });
			this.setClients(clients);
		});

		this.socketIOClient.on('VAD', (data: { activity: boolean; client: Client; socketId: string }) => {
			this.events.emit('player_talk', data.client.clientId, data.activity);
		});

		this.socketIOClient.on(
			'signal',
			(payload: { data: Record<string, unknown>; from: string; client?: Client }) => {
				this.handleSignal(payload);
			}
		);
	}

	private handleSignal({ data, from, client }: { data: Record<string, unknown>; from: string; client?: Client }): void {
		if (Object.prototype.hasOwnProperty.call(data, 'mobileHostInfo')) {
			const mobiledata = data as unknown as { mobileHostInfo: { isHostingMobile: boolean; isGameHost: boolean } };
			this.events.emit('mobileHostBeacon', from, mobiledata.mobileHostInfo);
			this.updateConnectingStage(ConnectingStage.searchingForHost);
			return;
		}

		if (Object.prototype.hasOwnProperty.call(data, 'gameState')) {
			if (this.currentHost && from !== this.currentHost) {
				return;
			}
			this.currentHost = from;
			this.lastPing = Date.now();
			this.updateConnectingStage(ConnectingStage.waitingForHostToEnable);
			const mobiledata = data as unknown as MobileData;
			this.events.emit('hostUpdate', mobiledata.gameState, mobiledata.lobbySettings);
			return;
		}

		if (!this.canReconnectPeer(from)) {
			console.warn('Signal from unknown socket, ignoring');
			return;
		}
		if (!Object.prototype.hasOwnProperty.call(data, 'type')) return;

		const signalData = data as unknown as SignalData;
		const existing = this.peers.get(from);
		if (signalData.type === 'offer') {
			if (this.peerOffers.get(from) === signalData.sdp && this.peerConnectionIds.get(from) === signalData.connectionId) {
				return;
			}
			// Both endpoints may retry at once. Keep exactly one of the competing offers.
			if (
				existing?.initiator &&
				(existing.connectionState === 'new' || existing.connectionState === 'connecting') &&
				(this.socketIOClient.id ?? '') < from
			) {
				return;
			}
			const peerClient = client ?? this.getClient(from);
			if (!peerClient) {
				console.warn('Offer from unknown client, ignoring');
				return;
			}
			const connection = this.createPeerConnection(from, false, peerClient, signalData.connectionId);
			this.peerOffers.set(from, signalData.sdp);
			void connection.signal(signalData);
		} else if (existing) {
			// Older servers omit the ID; updated ones echo it for the entire handshake.
			if (signalData.connectionId !== undefined && signalData.connectionId !== this.peerConnectionIds.get(from)) {
				return;
			}
			if (signalData.type === 'answer' && !existing.initiator) return;
			void existing.signal(signalData);
		}
	}
}
