import { Component, OnInit } from '@angular/core';
import { iosTransitionAnimation } from '@ionic/angular';
import * as io from 'socket.io-client';
import Peer from 'simple-peer';
import { connectionController, IConnectionController as IConnectionController } from '../comp/ConnectionController';
import { GameState, AmongUsState } from '../comp/AmongUsState';
import { promise } from 'protractor';
import { IDeviceInfo, ISettings } from '../comp/smallInterfaces';
import { Storage } from '@ionic/storage';
import { audioController } from '../comp/AudioController';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { async } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { Observable } from 'rxjs';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { nextTick } from 'process';

@Component({
	selector: 'app-main',
	templateUrl: './main.page.html',
	styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {
	client: SocketIOClient.Socket;
	peerConnections: Array<Peer> = [];
	cManager: IConnectionController;
	gameState: AmongUsState;
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
		connectionController.on('gamestateChange', (gamestate: AmongUsState) => {});
		this.cManager = connectionController;
		storage.get('settings').then((val) => {
			console.log('gotsettings', val);
			if (val && val !== null) {
				this.settings = val;
			}
			this.requestPermissions().then(() => {
				audioController.getDevices().then((devices) => {
					this.microphones = devices;
					if (!this.microphones.some((o) => o.id === this.settings.selectedMicrophone.id)) {
						this.settings.selectedMicrophone = devices.filter((o) => o.kind === 'audioinput')[0] ?? {
							id: 0,
							label: 'default',
							deviceId: 'default',
							kind: 'audioinput',
						};
					}else{
						this.settings.selectedMicrophone = this.microphones.find(o => o.id === this.settings.selectedMicrophone.id);
					}
				});
			});
		});
	}

	showNotification() {
		this.localNotifications.schedule({
			id: 1,
			title: 'Refresh BetterCrewlink',
			launch: false,
		});
	}

	connect() {
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

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile')) {
			const PERMISSIONS_NEEDED = [
				this.androidPermissions.PERMISSION.BLUETOOTH,
				this.androidPermissions.PERMISSION.RECORD_AUDIO,
				this.androidPermissions.PERMISSION.INTERNET,
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

	disconnect() {
		connectionController.disconnect(true);
	}

	reconnect() {
		connectionController.disconnect(false);
		this.connect();
	}

	onSettingsChange() {
		console.log('onsettingschange', this.settings);
		this.storage.set('settings', this.settings);
	}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	ngOnInit() {
		this.localNotifications.on('yes').subscribe((notification) => {
			this.reconnect();
			this.showNotification();
		});

		this.localNotifications.on('click').subscribe((notification) => {
			this.reconnect();
			this.showNotification();
		});
	}
}
