import { Component, OnInit } from '@angular/core';
import { iosTransitionAnimation } from '@ionic/angular';
import * as io from 'socket.io-client';
import Peer from 'simple-peer';
import { connectionController, IConnectionController as IConnectionController } from '../comp/ConnectionController';
import { GameState, AmongUsState } from '../comp/AmongUsState';

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
	username = 'G';
	gamecode = 'DEV12345';
	constructor() {
		connectionController.on('gamestateChange', (gamestate: AmongUsState) => {});
		this.cManager = connectionController;
	}

	connect() {
		console.log('[ConnectButton].[click]', { gamecode: this.gamecode, username: this.username });
		connectionController.connect(this.gamecode, this.username);
	}

	ngOnInit() {}
}
