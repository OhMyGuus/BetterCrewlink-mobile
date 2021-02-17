import { Component, Input, OnInit } from '@angular/core';
import { Player } from '../../services/AmongUsState';

const hatOffsets: { [key in number]: number | undefined } = {
	7: -50,
	21: -50,
	28: -50,
	35: -50,
	77: -50,
	90: -50,
};

@Component({
	selector: 'app-avatar',
	templateUrl: './avatar.component.html',
	styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent implements OnInit {
	backLayerHats = new Set([39, 4, 6, 15, 29, 42, 75, 85]);
	@Input() player: Player;
	@Input() talking: boolean;

	constructor() {}

	getHatY(): string {
		return `${(hatOffsets[this.player.hatId] || -33) + 22}%`;
	}
	ngOnInit() {}
}
