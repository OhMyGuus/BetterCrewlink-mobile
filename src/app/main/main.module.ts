import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MainPageRoutingModule } from './main-routing.module';

import { MainPage } from './main.page';

import { GlobalHeaderComponent } from '../global-header/global-header.component'

import { GlobalFooterComponent } from '../global-footer/global-footer.component'

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, MainPageRoutingModule],
	declarations: [MainPage, GlobalHeaderComponent, GlobalFooterComponent],
})
export class MainPageModule {}
