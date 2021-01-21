import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainPage } from './main.page';
import { SettingsPage } from '../settings/settings.page'

const routes: Routes = [
	{
		path: '',
		component: MainPage,
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
export class MainPageRoutingModule {}
