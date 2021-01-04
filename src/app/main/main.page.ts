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

	constructor(private storage: Storage) {
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
		connectionController.connect(
			this.settings.voiceServer,
			this.settings.gamecode,
			this.settings.username,
			this.settings.selectedMicrophone
		);
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
