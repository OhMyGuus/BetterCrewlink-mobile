import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { GameHelperService } from '../../services/game-helper.service';
import { IDeviceInfo } from '../../services/smallInterfaces';
import { GameState } from '../../common/AmongUsState';

@Component({
	selector: 'app-game',
	templateUrl: './game.component.html',
	styleUrls: ['./game.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class GameComponent implements OnInit, OnDestroy {
	private onChangeListener = () => this.changeDetectorRef.detectChanges();

	constructor(
		public gameHelper: GameHelperService,
		private changeDetectorRef: ChangeDetectorRef
	) {}

	compareFn(e1: IDeviceInfo, e2: IDeviceInfo): boolean {
		return e1 && e2 ? e1.id === e2.id : false;
	}

	getPlayers() {
		return this.gameHelper.voiceController.getRenderablePlayers();
	}

	canUseImpostorRadio(): boolean {
		const state = this.gameHelper.cManager.currentGameState;
		const me = this.gameHelper.cManager.localPLayer;
		return Boolean(
			this.gameHelper.cManager.lobbySettings.impostorRadioEnabled &&
				state?.gameState === GameState.TASKS &&
				me?.isImpostor &&
				!me.isDead
		);
	}

	startRadio(): void {
		this.gameHelper.voiceController.applyImpostorRadio(true);
	}

	stopRadio(): void {
		this.gameHelper.voiceController.applyImpostorRadio(false);
	}

	// Mirrors desktop's releaseHeldKeys(): a held transmit button must not stay "pressed" forever
	// if the app loses focus (backgrounded, notification shade, app switch, incoming call) while held.
	@HostListener('window:blur')
	onWindowBlur(): void {
		this.stopRadio();
	}

	@HostListener('document:visibilitychange')
	onVisibilityChange(): void {
		if (document.hidden) {
			this.stopRadio();
		}
	}

	ngOnInit() {
		console.log('ngOninit');
		this.gameHelper.events.on('onChange', this.onChangeListener);
	}

	ngOnDestroy() {
		this.gameHelper.events.off('onChange', this.onChangeListener);
		this.stopRadio();
	}
}
