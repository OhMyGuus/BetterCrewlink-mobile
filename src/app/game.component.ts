import Peer from 'simple-peer';
import { GameHelperService } from 'src/app/services/game-helper.service';
import { IDeviceInfo } from 'src/app/services/smallInterfaces';
import { SocketElement } from './services/smallInterfaces';
import { Player } from './services/AmongUsState';

export class GameComponent {
	client: SocketIOClient.Socket;
	peerConnections: Array<Peer> = [];
	constructor(public gameHelper: GameHelperService) {}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	getValues(map) {
		return Array.from(map.values());
	}

	getPlayers() {
		return Array.from(this.gameHelper.cManager.socketElements.values())
			.filter((o) => o.player !== undefined)
			.sort((a, b) => a.player?.colorId -  b.player?.colorId);
	}

	getValues2(map): SocketElement[] {
		return Array.from(map.values());
	}
}
