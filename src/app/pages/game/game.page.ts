import { Component, OnInit } from '@angular/core';
import { iosTransitionAnimation } from '@ionic/angular';
import * as io from 'socket.io-client';
import Peer from 'simple-peer';
import { connectionController, IConnectionController as IConnectionController } from '../../comp/ConnectionController';
import { GameState, AmongUsState } from '../../comp/AmongUsState';
import { promise } from 'protractor';
import { IDeviceInfo, ISettings } from '../../comp/smallInterfaces';
import { Storage } from '@ionic/storage';
import { audioController } from '../../comp/AudioController';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { async } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { Observable } from 'rxjs';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { nextTick } from 'process';
import { GameHelperService } from '../../comp/game-helper.service';

@Component({
	selector: 'app-game',
	templateUrl: './game.page.html',
	styleUrls: ['./game.page.scss'],
})
export class GamePage implements OnInit {
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
		private gameHelper: GameHelperService,
		private storage: Storage,
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		private localNotifications: LocalNotifications
	) {}

	showNotification() {
		this.localNotifications.schedule({
			id: 1,
			title: 'Refresh BetterCrewlink',
			launch: false,
		});
	}

	connect() {
		this.gameHelper.requestPermissions().then((haspermissions) => {
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
