import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Storage } from '@ionic/storage';
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

	constructor(private settingsService: SettingsService) {
		this.initializeApp();
	}

	initializeApp() {}

	async ngOnInit() {
		console.log('AppComponent initialized');
		this.settingsService.load();
	}
}
