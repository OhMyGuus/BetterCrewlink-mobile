import { Component, OnInit } from '@angular/core';
import Peer from 'simple-peer';
import { IConnectionController } from 'src/app/comp/ConnectionController';
import { AmongUsState } from '../../comp/AmongUsState';
import { IDeviceInfo, ISettings } from '../../comp/smallInterfaces';
import { GameHelperService } from '../../comp/game-helper.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { connectionController } from '../../comp/ConnectionController';
import { Storage } from '@ionic/storage';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
	client: SocketIOClient.Socket;
	peerConnections: Array<Peer> = [];
	cManager: IConnectionController;

	constructor(private gameHelper: GameHelperService) {
	}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	ngOnInit() {
		console.log('ngOninit');
	}
}
