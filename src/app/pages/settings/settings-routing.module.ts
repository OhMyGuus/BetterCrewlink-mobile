import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { SettingsPage } from './settings.page';
import { GamePage } from '../game/game.page';

const routes: Routes = [
	{
		path: '',
		component: SettingsPage,
	},
	{
		path: 'game',
		component: GamePage,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class SettingsPageRoutingModule {}
