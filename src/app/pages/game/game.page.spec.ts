import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { GamePage } from './game.page';

describe('GamePage', () => {
	let component: GamePage;
	let fixture: ComponentFixture<GamePage>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [GamePage],
			imports: [IonicModule.forRoot()],
		}).compileComponents();

		fixture = TestBed.createComponent(GamePage);
		component = fixture.componentInstance;
		fixture.detectChanges();
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
