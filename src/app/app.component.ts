import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AppCenterCrashes } from '@ionic-native/app-center-crashes/ngx';
import { AppCenterAnalytics } from '@ionic-native/app-center-analytics/ngx';
import { Cordova } from '@ionic-native/core';
import { title } from 'process';
declare let cordova: any;
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
		this.platform.ready().then(async () => {
			if (this.platform.is('cordova') || this.platform.is('capacitor')) {
				try {
					await this.appCenterCrashes.setEnabled(true);
					const report = await this.appCenterCrashes.lastSessionCrashReport();
					if (report) {
						console.log('Crash report', report);
					}

					this.appCenterAnalytics.setEnabled(true).then(() => {
						this.appCenterAnalytics.trackEvent('Started app', { time: new Date().toISOString() }).then(() => {
							console.log('Custom event tracked');
						});
					});
				} catch (exc) {}

				this.statusBar.styleDefault();
				this.splashScreen.hide();
				cordova.plugins.backgroundMode.setDefaults({
					title: 'BetterCrewlink is stil running',
					hidden: 'true',
					text: '',
					color: 'F14F4D',
					icon: 'ic_notification',
				});

				cordova.plugins.backgroundMode.configure({});
				// cordova.plugins.backgroundMode.on('activate', function () {
				// 	cordova.plugins.backgroundMode.disableBatteryOptimizations();
				// });
				cordova.plugins.backgroundMode.disableBatteryOptimizations();

				//	this.backgroundMode.disableWebViewOptimizations();
			}
		});
	}

	ngOnInit() {}
}
