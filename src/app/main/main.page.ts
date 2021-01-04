import { Component, OnInit } from '@angular/core';
import { iosTransitionAnimation } from '@ionic/angular';
import * as io from 'socket.io-client';
import Peer from 'simple-peer';
import { connectionController, IConnectionController as IConnectionController } from '../comp/ConnectionController';
import { GameState, AmongUsState } from '../comp/AmongUsState';
import { promise } from 'protractor';


@Component({
	selector: 'app-main',
	templateUrl: './main.page.html',
	styleUrls: ['./main.page.scss'],
})
export class MainPage implements OnInit {
	constructor() {
		connectionController.on('gamestateChange', (gamestate: AmongUsState) => {});
		this.cManager = connectionController;
	}
	client: SocketIOClient.Socket;
	peerConnections: Array<Peer> = [];
	cManager: IConnectionController;
	gameState: AmongUsState;
	username = 'G';
	gamecode = 'DEV12345';
	testing: any = [];
	microphones: IDeviceInfo[] = [];
	selectedMicrophone: IDeviceInfo;

	async getDevices(): Promise<IDeviceInfo[]> {
		let deviceId = 0;
		return (await navigator.mediaDevices.enumerateDevices())
			.filter((o) => o.kind === 'audioinput')
			.map((o) => {
				return {
					label: o.label || `Microphone ${deviceId++}`,
					deviceId: o.deviceId,
				};
			});
	}

	connect() {
		console.log('[ConnectButton].[click]', {
			gamecode: this.gamecode,
			username: this.username,
			selectedDevice: this.selectedMicrophone,
		});
		const audioSelect = document.querySelector('select#audioSource') as HTMLSelectElement;
		connectionController.connect(this.gamecode, this.username, this.selectedMicrophone.deviceId);
	}

	disconnect() {
		connectionController.disconnect();
	}

	ngOnInit() {
		this.getDevices().then((o) => {
			this.microphones = o;
			this.selectedMicrophone = this.microphones[0];
		});
	}
}
