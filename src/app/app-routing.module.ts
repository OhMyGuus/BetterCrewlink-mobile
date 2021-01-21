import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
	{
		path: '',
		redirectTo: 'settings',
		pathMatch: 'full',
	},
	{
		path: 'game',
		loadChildren: () => import('./pages/game/game.module').then((m) => m.GamePageModule),
	},
	{
		path: 'settings',
		loadChildren: () => import('./pages/settings/settings.module').then((m) => m.SettingsPageModule),
	},
];

@NgModule({
	imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
	exports: [RouterModule],
})
export class AppRoutingModule {}
