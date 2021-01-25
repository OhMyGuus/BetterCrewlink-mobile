import { Injectable } from '@angular/core';
import { connectionController, IConnectionController } from './ConnectionController';
import { ISettings, IDeviceInfo } from './smallInterfaces';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { audioController } from './AudioController';
import { Storage } from '@ionic/storage';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

@Injectable({
	providedIn: 'root',
})
export class GameHelperService {
	cManager: IConnectionController;
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
		private localNotifications: LocalNotifications
	) {
		this.cManager = connectionController;
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

			connectionController.connect(
				this.settings.voiceServer,
				this.settings.gamecode.toUpperCase(),
				this.settings.username,
				this.settings.selectedMicrophone.deviceId,
				this.settings.natFix
			);
			this.showNotification();
		});
	}

	disconnect() {
		connectionController.disconnect(true);
	}

	showNotification() {
		this.localNotifications.schedule({
			id: 1,
			title: 'Refresh BetterCrewlink',
			launch: false,
		});
	}

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile')) {
			const PERMISSIONS_NEEDED = [
				this.androidPermissions.PERMISSION.BLUETOOT,
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
				audioController.getDevices().then((devices) => {
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

		this.localNotifications.on('yes').subscribe((notification) => {
			this.connect();
			this.showNotification();
		});

		this.localNotifications.on('click').subscribe((notification) => {
			this.connect();
			this.showNotification();
		});
	}
}
