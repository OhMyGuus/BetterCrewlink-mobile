import { Injectable } from '@angular/core';
import { IDeviceInfo } from './smallInterfaces';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';import { Platform } from '@ionic/angular';
import { ConnectingStage, ConnectionController, ConnectionState } from './ConnectionController.service';
import { EventEmitter as EventEmitterO } from 'events';
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode/ngx';
import { SettingsService } from './settings.service';
import { BetterCrewlinkNativeService } from 'bcl-mobile-overlay';

interface NativeBridgeEvent extends Event {
	action: string;
}

@Injectable({
	providedIn: 'root',
})
export class GameHelperService {
	microphones: IDeviceInfo[] = [];
	IsMobile = false;
	error: string;
	events: EventEmitterO = new EventEmitterO();
	audioMuted = () => this.cManager.audioController.audioMuted ?? false;
	microphoneMuted = () =>
		(this.cManager.audioController.microphoneMuted || this.cManager.audioController.audioMuted) ?? false;
	localTalking = () => this.cManager?.audioController?.localTalking ?? false;
	constructor(
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		public cManager: ConnectionController,
		private backgroundMode: BackgroundMode,
		private settings: SettingsService
	) {
		this.IsMobile = true;//this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile');
		this.load();
	}

	reconnect() {
		this.cManager.disconnect(false);
		this.cManager.connect(
			this.settings.getVoiceServer(),
			this.settings.get().gamecode.toUpperCase(),
			this.settings.get().username,
			this.settings.get().selectedMicrophone.deviceId,
			this.settings.get().natFix
		);
		setTimeout(() => {
			this.updateViews();
		}, 1500);
	}

	connect() {
		this.disconnect(false);

		this.requestPermissions().then(async (haspermissions) => {
			if (!haspermissions) {
				console.error('permissions failed');
				this.cManager.connectionState = ConnectionState.error;
				this.error = 'No permissions to use microphone.';
				return;
			}
			// Android 14+ requires the mic to be actively capturing before a
			// "microphone" type foreground service can be started, otherwise
			// backgroundMode.enable() crashes with a SecurityException.
			this.cManager.deviceID = this.settings.get().selectedMicrophone.deviceId;
			await this.cManager.audioController.startAudio();
			this.backgroundMode.enable();
			this.cManager.connect(
				this.settings.getVoiceServer(),
				this.settings.get().gamecode.toUpperCase(),
				this.settings.get().username,
				this.settings.get().selectedMicrophone.deviceId,
				this.settings.get().natFix
			);
			this.showNotification();
		});
		setTimeout(() => {
			this.updateViews();
		}, 1500);
	}

	disconnect(disableBackgroundMode = true) {
		if (disableBackgroundMode) {
			this.backgroundMode.disable();
			if (this.IsMobile) {
				BetterCrewlinkNativeService.disconnect();
			}
		}
		this.cManager.disconnect(true);
	}

	muteMicrophone() {
		this.cManager.audioController.changeMuteState(!this.cManager.audioController.microphoneMuted, false);
		this.showNotification();
	}

	muteAudio() {
		this.cManager.audioController.changeMuteState(
			this.cManager.audioController.microphoneMuted,
			!this.cManager.audioController.audioMuted
		);
		this.showNotification();
	}

	async showNotification() {
		if (!this.IsMobile) return;
		console.log('showNotification BCL PLUGIN');
		await BetterCrewlinkNativeService.showNotification({
			audiomuted: this.audioMuted(),
			micmuted: this.microphoneMuted(),
			overlayEnabled: this.settings.get().overlayEnabled,
		});
	}

	getError(): string {
		return this.error;
	}

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova') || this.platform.is('android')) {
			const PERMISSIONS_NEEDED = [
				'android.permission.BLUETOOTH',
				// this.androidPermissions.PERMISSION.RECORD_AUDIO,
				// this.androidPermissions.PERMISSION.INTERNET,
			];

			try {
				await this.androidPermissions.requestPermissions(PERMISSIONS_NEEDED);
				for (const permission of PERMISSIONS_NEEDED) {
					const permissionResponse = await this.androidPermissions.checkPermission(permission);
					if (!permissionResponse.hasPermission) {
						return true;
					}
				}
			} catch {
				//	this.error = 'Bluetooth audio permission denied';
				return true;
			}
		}

		try {
			await this.cManager.audioController.requestPermissions();
		} catch {
			this.error = 'No permission to use microphone';
			return false;
		}
		return true;
	}

	getConnectionStage() {
		const test = ['LOBBY', 'TASKS', 'DISCUSSION', 'MENU', 'UNKNOWN'];
		switch (this.cManager.connectingStage) {
			case ConnectingStage.connectingToVoiceServer:
				return 'Connecting to voice server..';
			case ConnectingStage.startingMicrophone:
				return 'Initializing audio/microphone';
			case ConnectingStage.searchingForHost:
				return `Searching for bettercrewlink PC players in lobby: ${this.cManager.gamecode}`;
			case ConnectingStage.waitingForHostToEnable:
				return 'Waiting for a PC player to respond';
			case ConnectingStage.WaitingForGameData:
				return 'Waiting to recieve gamedata from player';
			case ConnectingStage.waitingForYouToJoin:
				return `Waiting for you to join with the name ${this.cManager.amongusUsername} --> ${
					test[this.cManager.oldGameState.gameState.toString()]
				}`;
			case ConnectingStage.parsingGameData:
				return 'Waiting for gamedata...';
			case ConnectingStage.FullyConnected:
				return 'Connected to the game...';
			default:
				return `unkown state ${this.cManager.connectingStage}`;
		}
	}

	updateViews() {
		this.events.emit('onChange');
	}

	load() {
		console.log('load??');

		this.cManager.events.on('onchange', () => {
			this.updateViews();
		});

		this.cManager.audioController.getDevices(this.IsMobile).then((devices) => {
			this.microphones = devices;
			if (!this.microphones.some((o) => o.id === this.settings.get().selectedMicrophone?.id)) {
				this.settings.get().selectedMicrophone = devices.filter((o) => o.kind === 'audioinput')[0] ?? {
					id: 0,
					label: 'default',
					deviceId: 'default',
					kind: 'audioinput',
				};
			} else {
				this.settings.get().selectedMicrophone = this.microphones.find(
					(o) => o.id === this.settings.get().selectedMicrophone.id
				);
			}
		});

		// this.connect();

		window.addEventListener('bettercrewlink_notification', (info: NativeBridgeEvent) => {
			console.log('[EVENT] bettercrewlink_notification: ', JSON.stringify(info));
			switch (info.action) {
				case 'REFRESH': {
					this.reconnect();
					break; 
				}
				case 'MUTEAUDIO': {
					this.muteAudio();
					break;
				}
				case 'MUTEMICROPHONE': {
					this.muteMicrophone();
					break;
				}
				case 'DISCONNECT': {
					this.disconnect(true);
					break;
				}
				default: {
					console.log('unkown notification action: ', info);
					break;
				}
			}
			console.log('Notification action done');
		});
		this.cManager.events.on('player_talk', async (clientId: number, talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					const sElement = this.cManager.getSocketElementByClientID(clientId);
					if (sElement && sElement.player && sElement.talking === talking) {
						BetterCrewlinkNativeService.showTalking({
							color: sElement.player?.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		this.cManager.audioController.events.on('local_talk', async (talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					if (talking === this.localTalking() && this.cManager.localPLayer) {
						BetterCrewlinkNativeService.showTalking({
							color: this.cManager.localPLayer.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		window.addEventListener('press_overlay', (info: NativeBridgeEvent) => {
			console.log('[EVENT] press_overlay: ', JSON.stringify(info));
			if (info.action === 'MICROPHONE') {
				this.muteMicrophone();
			} else if (info.action === 'AUDIO') {
				this.muteAudio();
			} else if (info.action === 'REFRESH') {
				this.reconnect();
			}
		});
		// LocalNotifications.on('yes').subscribe((notification) => {
		// 	this.connect();
		// 	this.showNotification();
		// });

		// LocalNotifications.on('click').subscribe((notification) => {
		// 	this.connect();
		// 	this.showNotification();
		// });
	}
}
