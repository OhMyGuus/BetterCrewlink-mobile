import { ChangeDetectorRef, Injectable } from '@angular/core';
import { ISettings, IDeviceInfo, VoiceServerOption } from './smallInterfaces';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
import { ConnectingStage, ConnectionController, ConnectionState } from './ConnectionController.service';
import { EventEmitter as EventEmitterO } from 'events';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AppCenterAnalytics } from '@ionic-native/app-center-analytics/ngx';
import { element } from 'protractor';
import { SettingsService } from './settings.service';

const { BetterCrewlinkNativePlugin } = Plugins;

export declare interface IGameHelperService {
	on(event: 'onChange', listener: () => void): this;
}

@Injectable({
	providedIn: 'root',
})
export class GameHelperService extends EventEmitterO implements IGameHelperService {
	microphones: IDeviceInfo[] = [];
	IsMobile: boolean = false;
	error: string;
	audioMuted = () => this.cManager.audioController.audioMuted ?? false;
	microphoneMuted = () =>
		(this.cManager.audioController.microphoneMuted || this.cManager.audioController.audioMuted) ?? false;
	localTalking = () => this.cManager?.audioController?.localTalking ?? false;
	constructor(
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		public cManager: ConnectionController,
		private backgroundMode: BackgroundMode,
		private appCenterAnalytics: AppCenterAnalytics,
		private settings: SettingsService
	) {
		super();
		this.IsMobile = this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile');
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

		this.appCenterAnalytics
			.trackEvent('connect', {
				gameCode: this.settings.get().gamecode.toUpperCase(),
				username: this.settings.get().username,
				micrphone: this.settings.get().selectedMicrophone.deviceId,
				natfixEnabled: this.settings.get().natFix ? 'true' : 'false',
			})
			.then(() => {});

		this.requestPermissions().then((haspermissions) => {
			if (!haspermissions) {
				console.error('permissions failed');
				this.cManager.connectionState = ConnectionState.error;
				this.error = 'No permissions to use microphone.';
				return;
			}
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
			if (!this.IsMobile) {
				BetterCrewlinkNativePlugin.disconnect();
			}
			this.appCenterAnalytics
				.trackEvent('disconnect', {
					disableBackgroundMode: disableBackgroundMode ? 'true' : 'false',
				})
				.then(() => {});
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
		await BetterCrewlinkNativePlugin.showNotification({
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
				const reqPermissionRespons = await this.androidPermissions.requestPermissions(PERMISSIONS_NEEDED);
				for (const permission of PERMISSIONS_NEEDED) {
					const permissionResponse = await this.androidPermissions.checkPermission(permission);
					if (!permissionResponse.hasPermission) {
						return true;
					}
				}
			} catch (exception) {
				//	this.error = 'Bluetooth audio permission denied';
				return true;
			}
		}

		try {
			await this.cManager.audioController.requestPermissions();
		} catch (exception) {
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
		this.emit('onChange');
	}

	load() {
		console.log('load??');

		this.cManager.on('onchange', () => {
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

		window.addEventListener('bettercrewlink_notification', (info: any) => {
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
		this.cManager.on('player_talk', async (clientId: number, talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					const sElement = this.cManager.getSocketElementByClientID(clientId);
					if (sElement && sElement.player && sElement.talking === talking) {
						BetterCrewlinkNativePlugin.showTalking({
							color: sElement.player?.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		this.cManager.audioController.on('local_talk', async (talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					if (talking === this.localTalking() && this.cManager.localPLayer) {
						BetterCrewlinkNativePlugin.showTalking({
							color: this.cManager.localPLayer.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		window.addEventListener('press_overlay', (info: any) => {
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
