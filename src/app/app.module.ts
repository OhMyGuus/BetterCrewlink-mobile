import { ChangeDetectorRef, NgModule } from '@angular/core';
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
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { GlobalFooterComponent } from './global-footer/global-footer.component';
import { GlobalHeaderComponent } from './global-header/global-header.component';
import { ISettings } from './comp/smallInterfaces';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/game/game.component';
import { FormsModule } from '@angular/forms';
import { AppCenterCrashes } from '@ionic-native/app-center-crashes/ngx';
import { AppCenterAnalytics } from '@ionic-native/app-center-analytics/ngx';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';

@NgModule({
	declarations: [AppComponent, GlobalFooterComponent, GlobalHeaderComponent, SettingsComponent, GameComponent],
	entryComponents: [],
	imports: [
		BrowserModule,
		IonicModule.forRoot(),
		AppRoutingModule,
		IonicStorageModule.forRoot(),
		ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
		FormsModule
	],
	providers: [
		StatusBar,
		SplashScreen,
		LocalNotifications,
		BackgroundMode,
		AppCenterCrashes,
		AppCenterAnalytics,
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		AndroidPermissions,
		Platform
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
