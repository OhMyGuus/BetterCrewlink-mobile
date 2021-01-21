import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GamePage } from './game.page';
import { SettingsPage } from '../settings/settings.page';

const routes: Routes = [
	{
		path: '',
		component: GamePage,
	},
	{
		path: 'settings',
		component: SettingsPage,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class GamePageRoutingModule {}
