import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { connectionController } from './comp/ConnectionController';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: ['app.component.scss'],
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

	constructor(
		private platform: Platform,
		private splashScreen: SplashScreen,
		private statusBar: StatusBar,
		private backgroundMode: BackgroundMode
	) {
		this.initializeApp();
	}

	initializeApp() {
		this.platform.ready().then(() => {
			this.statusBar.styleDefault();
			this.splashScreen.hide();
			this.backgroundMode.enable();
			// this.backgroundMode.disableWebViewOptimizations();
			this.backgroundMode.disableBatteryOptimizations();
		});
	}

	ngOnInit() {
		const path = window.location.pathname.split('folder/')[1];
		if (path !== undefined) {
			this.selectedIndex = this.appPages.findIndex((page) => page.title.toLowerCase() === path.toLowerCase());
		}
		connectionController.on('onstream', (stream) => {
			console.log('ONSTREAM RECIEVED1', stream);

			// audio.play();
		});
	}
}