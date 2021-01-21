import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';



import { GlobalHeaderComponent } from '../../global-header/global-header.component'

import { GlobalFooterComponent } from '../../global-footer/global-footer.component'
import { GamePage } from './game.page';
import { GamePageRoutingModule } from './game-routing.module';

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, GamePageRoutingModule],
	declarations: [GamePage, GlobalHeaderComponent, GlobalFooterComponent],
})
export class GamePageModule {}
