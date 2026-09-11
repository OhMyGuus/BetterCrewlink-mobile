import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Player } from '../../common/AmongUsState';
import { PlayerSetting } from '../../services/smallInterfaces';
import { SettingsService } from '../../services/settings.service';
import { playerSettingsKey } from '../../services/voice-controller.service';

const hatOffsets: Record<number, number | undefined> = {
	7: -50,
	21: -50,
	28: -50,
	35: -50,
	77: -50,
	90: -50,
	94: -15,
	103: -50,
};

const coloredHats: number[] = [77, 90];

@Component({
	selector: 'app-avatar',
	templateUrl: './avatar.component.html',
	styleUrls: ['./avatar.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class AvatarComponent {
	backLayerHats = new Set([39, 4, 6, 15, 29, 42, 75, 85, 102, 105, 106, 104, 103]);
	@Input() player: Player;
	@Input() talking: boolean;
	@Input() isDead = false;
	@Input() settings: PlayerSetting = undefined;
	volumeOpen: boolean;
	readonly MAXVOLUME = 500;
	constructor(private settingsService: SettingsService) {}

	clickable() {
		return this.settings !== undefined;
	}

	// Desktop's cosmetic IDs are strings (mod-support); mobile's numeric asset tables below
	// only cover the pre-3.2 numeric ID range. Numeric hosts still coerce cleanly here; a
	// modern string ID coerces to NaN and falls through to the "no cosmetic" defaults.
	// Full string-ID/asset support is tracked separately (P1 cosmetics).
	hatIdNum(): number {
		return Number(this.player.hatId);
	}
	skinIdNum(): number {
		return Number(this.player.skinId);
	}
	getHatY(): string {
		return `${(hatOffsets[this.hatIdNum()] || -33) + 22}%`;
	}
	getHatImage(): string {
		const hatIdNum = this.hatIdNum();
		// Colored hat variants only exist for colorIds 0-11; fall back to the plain sprite
		// beyond that instead of requesting a nonexistent file (which would hide the hat).
		if (coloredHats.includes(hatIdNum) && this.player.colorId <= 11) {
			return `${hatIdNum}-${this.player.colorId}`;
		}
		return `${hatIdNum}`;
	}
	isBackLayerHat(): boolean {
		return this.backLayerHats.has(this.hatIdNum());
	}

	/** Body sprite, with a fallback for out-of-range colors so the avatar never renders broken. */
	getBodyImage(): string {
		const colorId = Number(this.player.colorId);
		const alive = colorId >= 0 && colorId <= 17 ? colorId : 0;
		return `assets/avatar/players/${alive}-${this.isDead ? 'dead' : 'alive'}.png`;
	}

	/** Last-resort: hide the body instead of showing a broken-image glyph (e.g. a colorId that isn't a number). */
	onBodyImageError(event: Event): void {
		(event.currentTarget as HTMLImageElement).style.display = 'none';
	}

	openVolume(state = !this.volumeOpen) {
		console.log(this.settings);
		if (!this.settings) {
			return;
		}
		this.volumeOpen = state;
	}

	onVolumeChange() {
		if (this.settings) {
			this.settingsService.savePlayerSetting(playerSettingsKey(this.player), this.settings);
		}
	}

	onMuteToggle() {
		if (!this.settings) return;
		this.settings.isMuted = !this.settings.isMuted;
		this.settingsService.savePlayerSetting(playerSettingsKey(this.player), this.settings);
	}
}
