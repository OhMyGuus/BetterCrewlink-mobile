import { ChangeDetectorRef, Injectable } from '@angular/core';
import { ISettings, IDeviceInfo } from './smallInterfaces';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { title } from 'process';
import { LocalNotification, Plugins } from '@capacitor/core';
import AudioController from './AudioController.service';
import { ConnectionController } from './ConnectionController.service';
import { EventEmitter as EventEmitterO } from 'events';

const { LocalNotifications } = Plugins;


export declare interface IGameHelperService {
	on(event: 'onConnect', listener: () => void): this;
}

@Injectable({
	providedIn: 'root',
})
export class GameHelperService extends EventEmitterO  implements IGameHelperService{
	microphones: IDeviceInfo[] = [];
	settings: ISettings = {
		gamecode: '',
		voiceServer: 'https://bettercrewl.ink',
		username: '',
		selectedMicrophone: { id: 0, label: 'default', deviceId: 'default', kind: 'audioinput' },
		natFix: false,
	};

	constructor(
		private storage: Storage,
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		public cManager: ConnectionController
	) {
		super();
		this.load();
	}

	saveSettings() {
		this.storage.set('settings', this.settings);
	}

	connect() {
		this.disconnect();

		this.requestPermissions().then((haspermissions) => {
			if (!haspermissions) {
				console.log('permissions failed');
			}
			console.log('CALL CONNECT');
			this.cManager.connect(
				this.settings.voiceServer,
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

	disconnect() {
		this.cManager.disconnect(true);
	}

	async showNotification() {
		await LocalNotifications.requestPermission();
		const notifs = await LocalNotifications.schedule({
			notifications: [
				{
					title: 'Refresh BetterCrewlink',
					body: 'click',
					id: 1,
					sound: null,
					attachments: null,
					extra: null,
				},
			],
		});
		// this.localNotifications.schedule({
		// 	id: 1,
		// 	title: 'Refresh BetterCrewlink',
		// 	launch: false,
		// 	smallIcon: 'res://mipmap-xxxhdpi/ic_stat_zin.png',
		// });
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
		this.storage.get('settings').then((val) => {
			console.log('gotsettings', val);
			if (val && val !== null) {
				this.settings = val;
			}

			this.requestPermissions().then(() => {
				this.cManager.audioController.getDevices().then((devices) => {
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
		});
		LocalNotifications.addListener('localNotificationActionPerformed', () => {
			console.log('Action performed..');
			this.connect();
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
