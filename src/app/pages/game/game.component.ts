import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import Peer from 'simple-peer';
import { IConnectionController } from 'src/app/comp/ConnectionController.service';
import { AmongUsState } from '../../comp/AmongUsState';
import { IDeviceInfo, ISettings } from '../../comp/smallInterfaces';
import { GameHelperService } from '../../comp/game-helper.service';
import { Storage } from '@ionic/storage';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
	client: SocketIOClient.Socket;
	peerConnections: Array<Peer> = [];

	constructor(public gameHelper: GameHelperService, private changeDetectorRef: ChangeDetectorRef) {}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	ngOnInit() {
		console.log('ngOninit');
		this.gameHelper.on('onConnect', () => {
			this.changeDetectorRef.detectChanges();
		});
	}
}
