import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
	selector: 'app-footer',
	templateUrl: './global-footer.component.html',
	styleUrls: ['./global-footer.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class GlobalFooterComponent {}
