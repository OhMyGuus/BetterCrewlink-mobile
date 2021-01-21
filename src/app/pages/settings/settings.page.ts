import { Component, OnInit } from '@angular/core';
import Peer from 'simple-peer';
import { IConnectionController } from 'src/app/comp/ConnectionController';
import { AmongUsState } from '../../comp/AmongUsState';
import { GameHelperService } from '../../comp/game-helper.service';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.page.html',
	styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
	constructor(private gameHelper: GameHelperService) {}

	onSettingsChange() {
		this.gameHelper.onSettingsChange();
	}

	compareFn(e1: string, e2: string): boolean {
		return e1 && e2 ? e1 === e2 : false;
	}

	ngOnInit() {}
}
