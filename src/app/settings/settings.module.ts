import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SettingsPageRoutingModule } from './settings-routing.module';

import { SettingsPage } from './settings.page';

import { GlobalHeaderComponent } from '../global-header/global-header.component'

import { GlobalFooterComponent } from '../global-footer/global-footer.component'

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SettingsPageRoutingModule
  ],
  declarations: [SettingsPage, GlobalHeaderComponent, GlobalFooterComponent]
})
export class SettingsPageModule {}
