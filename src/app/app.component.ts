import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { connectionController } from './comp/ConnectionController';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AppCenterCrashes } from '@ionic-native/app-center-crashes/ngx';
import { AppCenterAnalytics } from '@ionic-native/app-center-analytics/ngx';

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
		private backgroundMode: BackgroundMode,
		private appCenterCrashes: AppCenterCrashes,
		private appCenterAnalytics: AppCenterAnalytics
	) {
		this.initializeApp();
	}

	initializeApp() {
		this.platform.ready().then(() => {
			if (this.platform.is('cordova') || this.platform.is('capacitor') ) {
				this.statusBar.styleDefault();
				this.splashScreen.hide();
				this.backgroundMode.enable();
				//	this.backgroundMode.disableWebViewOptimizations();
				this.backgroundMode.disableBatteryOptimizations();

				this.appCenterCrashes.setEnabled(true).then(() => {
					this.appCenterCrashes.lastSessionCrashReport().then((report) => {
						console.log('Crash report', report);
					});
				});
				this.appCenterAnalytics.setEnabled(true).then(() => {
					this.appCenterAnalytics.trackEvent('My Event', { TEST: 'HELLO_WORLD' }).then(() => {
						console.log('Custom event tracked');
					});
				});
			}
		});
	}

	ngOnInit() {}
}
