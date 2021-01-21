import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsPage } from '../../settings/settings.page'
import { GamePage } from './game.page';

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
