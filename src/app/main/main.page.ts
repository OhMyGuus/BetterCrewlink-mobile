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
		voiceServer: 'https://crewl.ink',
		username: '',
		selectedMicrophone: 'default',
	};

	constructor(private storage: Storage, private androidPermissions: AndroidPermissions, public platform: Platform) {
		connectionController.on('gamestateChange', (gamestate: AmongUsState) => {});
		this.cManager = connectionController;
		storage.get('settings').then((val) => {
			console.log('gotsettings', val);
			if (val && val !== null) {
				this.settings = val;
			}
		});
	}

	connect() {
		alert('testing..');

		this.requestPermissions().then((haspermissions) => {
			if (haspermissions) {
				connectionController.connect(
					this.settings.voiceServer,
					this.settings.gamecode.toUpperCase(),
					this.settings.username,
					this.settings.selectedMicrophone
				);
			} else {
				alert('Cannot access Microphone or network');
			}
		});
	}

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova')) {
			alert('asking for permissions');
			const PERMISSIONS_NEEDED = [
				'android.permission.FOREGROUND_SERVICE',
				this.androidPermissions.PERMISSION.BLUETOOTH,
				this.androidPermissions.PERMISSION.INTERNET,
				this.androidPermissions.PERMISSION.RECORD_AUDIO,
				this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS,
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
		connectionController.disconnect();
	}

	onSettingsChange() {
		console.log('onsettingschange');
		this.storage.set('settings', this.settings);
	}

	compareFn(e1: string, e2: string): boolean {
		return e1 && e2 ? e1 === e2 : false;
	}

	ngOnInit() {
		audioController.getDevices().then((o) => {
			this.microphones = o;
		});
	}
}
