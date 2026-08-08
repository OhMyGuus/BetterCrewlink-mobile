import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { GameHelperService } from '../../services/game-helper.service';

@Component({
	selector: 'app-header',
	templateUrl: './global-header.component.html',
	styleUrls: ['./global-header.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false,
})
export class GlobalHeaderComponent implements OnInit {
	constructor(public gameHelper: GameHelperService) {}
	ngOnInit(): void {}
}
