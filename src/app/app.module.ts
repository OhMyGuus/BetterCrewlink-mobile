import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { IonicStorageModule } from '@ionic/storage';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';

@NgModule({
	declarations: [AppComponent],
	entryComponents: [],
	imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, IonicStorageModule.forRoot(), ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production })],
	providers: [
		StatusBar,
		SplashScreen,
		BackgroundMode,
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		AndroidPermissions,
		Platform,
		LocalNotifications
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
