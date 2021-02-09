import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { GameHelperService } from 'src/app/services/game-helper.service';
import { IDeviceInfo } from 'src/app/services/smallInterfaces';
const { OverlayPlugin } = Plugins;
const { BetterCrewlinkNativePlugin } = Plugins;

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

	// async test() {
	// 	alert((await BetterCrewlinkNativePlugin.showNotification({ message: 'CUSTOM MESSAGE' })).result);

	// 	//	alert((await OverlayPlugin.echo({value: 'somefilter'})).value);
	// }

	ngOnInit() {
		this.gameHelper.on('onConnect', () => {
			this.changeDetectorRef.detectChanges();
		});
	}
}
