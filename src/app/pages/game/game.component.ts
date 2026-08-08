import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import Peer from 'simple-peer';
import { Socket } from 'socket.io-client';
import { GameHelperService } from '../../services/game-helper.service';
import { IDeviceInfo } from '../../services/smallInterfaces';
import { SocketElement } from '../../services/smallInterfaces';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false,
})
export class GameComponent implements OnInit {
	client: Socket;
	peerConnections: Peer[] = [];
	constructor(
		public gameHelper: GameHelperService,
		private changeDetectorRef: ChangeDetectorRef
	) {}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	getValues(map) {
		return Array.from(map.values());
	}

	getPlayers() {
		return Array.from(this.gameHelper.cManager.socketElements.values())
			.filter((o) => o.player !== undefined)
			.sort((a, b) => a.player?.colorId - b.player?.colorId);
	}

	getValues2(map): SocketElement[] {
		return Array.from(map.values());
	}

	ngOnInit() {
		console.log('ngOninit');
		this.gameHelper.events.on('onChange', () => {
			this.changeDetectorRef.detectChanges();
		});
	}
}
