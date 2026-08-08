import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';

import { Platform } from '@ionic/angular';
import { RouterTestingModule } from '@angular/router/testing';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
	let platformReadySpy, platformSpy;

	beforeEach(waitForAsync(() => {
		platformReadySpy = Promise.resolve();
		platformSpy = jasmine.createSpyObj('Platform', { ready: platformReadySpy });

		TestBed.configureTestingModule({
			declarations: [AppComponent],
			imports: [RouterTestingModule],
			providers: [
				{ provide: Platform, useValue: platformSpy },
			],
			schemas: [CUSTOM_ELEMENTS_SCHEMA],
		}).compileComponents();
	}));

	it('should create the app', async () => {
		const fixture = TestBed.createComponent(AppComponent);
		const app = fixture.debugElement.componentInstance;
		expect(app).toBeTruthy();
	});

	it('should initialize the app', async () => {
		TestBed.createComponent(AppComponent);
		expect(platformSpy.ready).toHaveBeenCalled();
		await platformReadySpy;
	});

	it('should have menu labels', async () => {
		const fixture = await TestBed.createComponent(AppComponent);
		await fixture.detectChanges();
		const app = fixture.nativeElement;
		const menuItems = app.querySelectorAll('ion-label');
		expect(menuItems.length).toEqual(12);
		expect(menuItems[0].textContent).toContain('Inbox');
		expect(menuItems[1].textContent).toContain('Outbox');
	});

	it('should have urls', async () => {
		const fixture = await TestBed.createComponent(AppComponent);
		await fixture.detectChanges();
		const app = fixture.nativeElement;
		const menuItems = app.querySelectorAll('ion-item');
		expect(menuItems.length).toEqual(12);
		expect(menuItems[0].getAttribute('ng-reflect-router-link')).toEqual('/folder/Inbox');
		expect(menuItems[1].getAttribute('ng-reflect-router-link')).toEqual('/folder/Outbox');
	});
});
