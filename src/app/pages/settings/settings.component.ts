import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { GameHelperService } from '../../services/game-helper.service';
import { IDeviceInfo } from '../../services/smallInterfaces';
import { SettingsService } from '../../services/settings.service';

// const { OverlayPlugin } = Plugins;
// const { BetterCrewlinkNativePlugin } = Plugins;

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class SettingsComponent implements OnInit, OnDestroy {
	private onChangeListener = () => this.changeDetectorRef.detectChanges();

	constructor(
		public gameHelper: GameHelperService,
		private changeDetectorRef: ChangeDetectorRef,
		private settings: SettingsService
	) {}

	getSettings() {
		return this.settings.get();
	}

	onSettingsChange() {
		this.settings.save();
		console.log('Settings changed:', this.settings.get());
	}

	compareFn(e1: IDeviceInfo | undefined, e2: IDeviceInfo | undefined): boolean {
		if (!e1 || !e2) return e1 === e2;
		return e1.id === e2.id;
	}

	// async test() {
	// 	alert((await BetterCrewlinkNativePlugin.showNotification({ message: 'CUSTOM MESSAGE' })).result);

	// 	//	alert((await OverlayPlugin.echo({value: 'somefilter'})).value);
	// }

	ngOnInit() {
		this.gameHelper.events.on('onChange', this.onChangeListener);
	}

	ngOnDestroy() {
		this.gameHelper.events.off('onChange', this.onChangeListener);
	}
}
