import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { SettingsComponent } from './pages/settings/settings.component';
import { GameComponent } from './pages/game/game.component';

const routes: Routes = [
	{
		path: '',
		redirectTo: 'settings',
		pathMatch: 'full',
	},
	{
		path: 'game',
		component: GameComponent
	},
	{
		path: 'settings',
		component: SettingsComponent
	},
];

@NgModule({
	imports: [RouterModule.forRoot(routes)],
	exports: [RouterModule],
})
export class AppRoutingModule {}
