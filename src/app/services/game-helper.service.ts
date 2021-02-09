import { ChangeDetectorRef, Injectable } from '@angular/core';
import { ISettings, IDeviceInfo, VoiceServerOption } from './smallInterfaces';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { title } from 'process';
import { LocalNotification, Plugins } from '@capacitor/core';
import AudioController from './AudioController.service';
import { ConnectionController } from './ConnectionController.service';
import { EventEmitter as EventEmitterO } from 'events';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

const { LocalNotifications, BetterCrewlinkNativePlugin } = Plugins;

export declare interface IGameHelperService {
	on(event: 'onConnect', listener: () => void): this;
}

@Injectable({
	providedIn: 'root',
})
export class GameHelperService extends EventEmitterO implements IGameHelperService {
	microphones: IDeviceInfo[] = [];
	settings: ISettings = {
		gamecode: '',
		voiceServerOption: 1,
		customVoiceServer: 'https://bettercrewl.ink',
		username: '',
		selectedMicrophone: { id: 0, label: 'default', deviceId: 'default', kind: 'audioinput' },
		natFix: false,
	};
	IsMobile: boolean = false;
	audioMuted = () => this.cManager.audioController.audioMuted ?? false;
	microphoneMuted = () =>
		(this.cManager.audioController.microphoneMuted || this.cManager.audioController.audioMuted) ?? false;

	constructor(
		private storage: Storage,
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		public cManager: ConnectionController,
		private backgroundMode: BackgroundMode
	) {
		super();
		this.load();
		this.IsMobile = this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile');
	}

	saveSettings() {
		this.storage.set('settings', this.settings);
	}

	getVoiceServer() {
		switch (this.settings.voiceServerOption) {
			case VoiceServerOption.ORIGINALCREWLINK:
				return this.IsMobile ? 'https://crewl.ink' : 'https://ubuntu1.guus.info';
			case VoiceServerOption.BETTERCREWLINK:
				return 'https://bettercrewl.ink';
			case VoiceServerOption.CUSTOM:
				return !this.IsMobile && this.settings.customVoiceServer.includes('//crewl.ink')
					? 'https://ubuntu1.guus.info'
					: this.settings.customVoiceServer;
		}
	}

	connect() {
		this.disconnect(false);

		this.requestPermissions().then((haspermissions) => {
			if (!haspermissions) {
				console.log('permissions failed');
			}
			this.backgroundMode.enable();
			this.cManager.connect(
				this.getVoiceServer(),
				this.settings.gamecode.toUpperCase(),
				this.settings.username,
				this.settings.selectedMicrophone.deviceId,
				this.settings.natFix
			);
			this.showNotification();
		});
		setTimeout(() => {
			this.emit('onConnect');
		}, 1500);
	}

	disconnect(disableBackgroundMode = true) {
		if (disableBackgroundMode) {
			this.backgroundMode.disable();
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
		await BetterCrewlinkNativePlugin.showNotification({
			audiomuted: this.audioMuted(),
			micmuted: this.microphoneMuted(),
		});
	}

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile')) {
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
						return false;
					}
				}
			} catch (exception) {
				return false;
			}
		}
		return true;
	}

	load() {
		console.log('load??');
		this.storage.get('settings').then((val) => {
			console.log('gotsettings', val);
			if (val && val !== null) {
				this.settings = val;
			}
			this.requestPermissions().then(() => {
				this.cManager.audioController.getDevices(this.IsMobile).then((devices) => {
					this.microphones = devices;
					if (!this.microphones.some((o) => o.id === this.settings.selectedMicrophone?.id)) {
						this.settings.selectedMicrophone = devices.filter((o) => o.kind === 'audioinput')[0] ?? {
							id: 0,
							label: 'default',
							deviceId: 'default',
							kind: 'audioinput',
						};
					} else {
						this.settings.selectedMicrophone = this.microphones.find(
							(o) => o.id === this.settings.selectedMicrophone.id
						);
					}
				});
			});
			// this.connect();
		});

		window.addEventListener('bettercrewlink_notification', (info: any) => {
			switch (info.action) {
				case 'REFRESH': {
					this.cManager.disconnect(false);
					this.cManager.connect(
						this.getVoiceServer(),
						this.settings.gamecode.toUpperCase(),
						this.settings.username,
						this.settings.selectedMicrophone.deviceId,
						this.settings.natFix
					);
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
				default: {
					console.log('unkown notification action: ', info);
					break;
				}
			}
			console.log('Notification action done');
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
