import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import Peer from 'simple-peer';
import { GameHelperService } from 'src/app/services/game-helper.service';
import { IDeviceInfo } from 'src/app/services/smallInterfaces';
import { SocketElement } from '../../services/smallInterfaces';

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

	getValues(map) {
		return Array.from(map.values());
	}

	getPlayers() {
		return Array.from(this.gameHelper.cManager.socketElements.values()).filter((o) => o.player !== undefined);
	}

	getValues2(map): SocketElement[] {
		return Array.from(map.values());
	}

	ngOnInit() {
		console.log('ngOninit');
		this.gameHelper.on('onConnect', () => {
			this.changeDetectorRef.detectChanges();
		});
	}
}
