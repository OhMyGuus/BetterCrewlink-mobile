import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { GameHelperService } from '../../services/game-helper.service';
import { IDeviceInfo } from '../../services/smallInterfaces';
import { SettingsService } from '../../services/settings.service';

@Component({
	selector: 'app-audio-settings',
	templateUrl: './audio-settings.component.html',
	styleUrls: ['./audio-settings.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class AudioSettingsComponent implements OnInit, OnDestroy {
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
	}

	/** Audio-processing settings can take effect live on an already-open mic chain. */
	onAudioSettingChange() {
		this.onSettingsChange();
		this.gameHelper.cManager.audioController.updateMicrophoneSettings(this.settings.get());
	}

	onSpeakerChange() {
		this.onSettingsChange();
		this.gameHelper.cManager.audioController.setSpeaker(this.settings.get().selectedSpeaker?.deviceId);
	}

	compareFn(e1: IDeviceInfo | undefined, e2: IDeviceInfo | undefined): boolean {
		if (!e1 || !e2) return e1 === e2;
		return e1.id === e2.id;
	}

	ngOnInit() {
		this.gameHelper.events.on('onChange', this.onChangeListener);
	}

	ngOnDestroy() {
		this.gameHelper.events.off('onChange', this.onChangeListener);
	}
}
