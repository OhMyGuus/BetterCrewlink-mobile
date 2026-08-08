import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'app-footer',
	templateUrl: './global-footer.component.html',
	styleUrls: ['./global-footer.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false,
})
export class GlobalFooterComponent implements OnInit {
	constructor() {}

	ngOnInit() {}
}
