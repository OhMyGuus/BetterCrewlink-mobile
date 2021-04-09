import { Component, Input, OnInit } from '@angular/core';
import { Socket } from 'dgram';
import { Player } from '../../services/AmongUsState';
import { SocketElement, PlayerSetting } from '../../services/smallInterfaces';
import { SettingsService } from '../../services/settings.service';

const hatOffsets: { [key in number]: number | undefined } = {
	7: -50,
	21: -50,
	28: -50,
	35: -50,
	77: -50,
	90: -50,
	94: -15,
};

const coloredHats: number[] = [77, 90];

@Component({
	selector: 'app-avatar',
	templateUrl: './avatar.component.html',
	styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent implements OnInit {
	backLayerHats = new Set([39, 4, 6, 15, 29, 42, 75, 85]);
	@Input() player: Player;
	@Input() talking: boolean;
	@Input() isDead: boolean = false;
	@Input() settings: PlayerSetting = undefined;
	volumeOpen: boolean;
	readonly MAXVOLUME = 500;
	constructor(private settingsService: SettingsService) {}

	clickable() {
		return this.settings !== undefined;
	}
	getHatY(): string {
		return `${(hatOffsets[this.player.hatId] || -33) + 22}%`;
	}
	getHatImage(): string {
		return coloredHats.includes(this.player.hatId)
			? `${this.player.hatId}-${this.player.colorId}`
			: `${this.player.hatId}`;
	}

	openVolume(state = !this.volumeOpen) {
		console.log(this.settings);
		if (!this.settings) {
			return;
		}
		this.volumeOpen = state;
	}

	onVolumeChange() {
		console.log("Volume: ",this.player.nameHash, this.settings )

		if (this.settings) {
			console.log("Volume: ",this.player.nameHash, this.settings )
			this.settingsService.savePlayerSetting(this.player.nameHash, this.settings);
		}
	}

	ngOnInit() {}
}
