import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GameHelperService } from '../../comp/game-helper.service';
import { IDeviceInfo, ISettings } from '../../comp/smallInterfaces';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
	constructor(public gameHelper: GameHelperService, private changeDetectorRef: ChangeDetectorRef) {}

	onSettingsChange() {
		this.gameHelper.saveSettings();
	}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	ngOnInit() {
		this.gameHelper.on('onConnect', () => {
			this.changeDetectorRef.detectChanges();
		});
	}
}
