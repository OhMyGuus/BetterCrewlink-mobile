import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { IonicStorageModule } from '@ionic/storage-angular';
import { Platform } from '@ionic/angular';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/game/game.component';
import { FormsModule } from '@angular/forms';
import { GlobalFooterComponent } from './compontents/global-footer/global-footer.component';
import { GlobalHeaderComponent } from './compontents/global-header/global-header.component';
import { AvatarComponent } from './compontents/avatar/avatar.component';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode/ngx';
@NgModule({
	declarations: [
		AppComponent,
		GlobalFooterComponent,
		AvatarComponent,
		GlobalHeaderComponent,
		SettingsComponent,
		GameComponent,
	],
	imports: [
		BrowserModule,
		IonicModule.forRoot(),
		AppRoutingModule,
		IonicStorageModule.forRoot(),
		ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
		FormsModule,
	],
	providers: [
		BackgroundMode,
		AndroidPermissions,
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		Platform,
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
