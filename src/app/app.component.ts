import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { SettingsService } from './services/settings.service';
@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: ['app.component.scss'],
	changeDetection: ChangeDetectionStrategy.Eager,
	standalone: false,
})
export class AppComponent implements OnInit {
	public selectedIndex = 0;
	public appPages = [
		{
			title: 'game',
			url: '/game',
			icon: 'home',
		},
		{
			title: 'settings',
			url: '/settings',
			icon: 'settings',
		},
	];

	constructor(private settingsService: SettingsService) {}

	async ngOnInit() {
		console.log('AppComponent initialized');
		this.settingsService.load();
	}
}
