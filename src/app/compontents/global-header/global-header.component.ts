import { Component, OnInit } from '@angular/core';
import { GameHelperService } from 'src/app/services/game-helper.service';

@Component({
	selector: 'app-header',
	templateUrl: './global-header.component.html',
	styleUrls: ['./global-header.component.scss'],
})
export class GlobalHeaderComponent implements OnInit {
	constructor(public gameHelper: GameHelperService) {}

	// eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
	ngOnInit(): void {}
}
