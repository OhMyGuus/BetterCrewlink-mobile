import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/game/game.component';
import { LobbySettingsComponent } from './pages/lobby-settings/lobby-settings.component';
import { AudioSettingsComponent } from './pages/audio-settings/audio-settings.component';

const routes: Routes = [
	{
		path: '',
		redirectTo: 'settings',
		pathMatch: 'full',
	},
	{
		path: 'game',
		component: GameComponent,
	},
	{
		path: 'settings',
		component: SettingsComponent,
	},
	{
		path: 'lobby-settings',
		component: LobbySettingsComponent,
	},
	{
		path: 'audio-settings',
		component: AudioSettingsComponent,
	},
	{ path: '**', redirectTo: '/settings', pathMatch: 'full' },
];

@NgModule({
	imports: [RouterModule.forRoot(routes, {})],
	exports: [RouterModule],
})
export class AppRoutingModule {}
