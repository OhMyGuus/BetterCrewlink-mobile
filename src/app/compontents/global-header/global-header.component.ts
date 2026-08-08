import { Component, ChangeDetectionStrategy } from '@angular/core';
import { GameHelperService } from '../../services/game-helper.service';

@Component({
	selector: 'app-header',
	templateUrl: './global-header.component.html',
	styleUrls: ['./global-header.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false,
})
export class GlobalHeaderComponent {
	constructor(public gameHelper: GameHelperService) {}
}
