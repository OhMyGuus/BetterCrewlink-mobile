import { ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AvatarComponent } from './avatar.component';
import { CosmeticRender, CosmeticType } from '../../services/cosmetics.service';
import { SettingsService } from '../../services/settings.service';
import { Player } from '../../common/AmongUsState';

function makePlayer(overrides: Partial<Player> = {}): Player {
	return {
		ptr: 0,
		id: 0,
		clientId: 0,
		name: 'Player',
		nameHash: 0,
		playerConfigId: 0,
		friendCode: '',
		playerUid: '',
		playerIdentifier: '',
		colorId: 0,
		hatId: 'hat_pizza',
		petId: 0,
		skinId: 'skin_hazmat',
		visorId: 'visor_sun',
		disconnected: false,
		isImpostor: false,
		isDead: false,
		taskPtr: 0,
		objectPtr: 0,
		isLocal: false,
		shiftedColor: 0,
		bugged: false,
		x: 0,
		y: 0,
		inVent: false,
		isDummy: false,
		isbetter: false,
		...overrides,
	};
}

const RENDER: CosmeticRender = { src: 'resolved.png', top: 'top', left: 'left', width: 'width', zIndex: 4 };

function makeComponent(player: Player = makePlayer()) {
	const cosmetics = {
		version$: new BehaviorSubject(0),
		initializeHats: jasmine.createSpy('initializeHats'),
		getCosmeticRender: jasmine.createSpy('getCosmeticRender').and.returnValue(RENDER),
	};
	const changeDetectorRef = { markForCheck: jasmine.createSpy('markForCheck') };
	const component = new AvatarComponent(
		{} as SettingsService,
		cosmetics as never,
		changeDetectorRef as unknown as ChangeDetectorRef
	);
	component.player = player;
	return { component, cosmetics, changeDetectorRef };
}

describe('AvatarComponent', () => {
	it('starts loading the shared hat collection', () => {
		const { cosmetics } = makeComponent();
		expect(cosmetics.initializeHats).toHaveBeenCalled();
	});

	it('resolves each cosmetic through the service with the player colour and lobby mod', () => {
		const { component, cosmetics } = makeComponent(makePlayer({ colorId: 4 }));
		component.mod = 'LAS_MONJAS';

		expect(component.getHat()).toBe(RENDER);
		expect(component.getVisor()).toBe(RENDER);
		expect(component.getSkin()).toBe(RENDER);
		expect(component.getHatBack()).toBe(RENDER);

		expect(cosmetics.getCosmeticRender).toHaveBeenCalledWith(4, CosmeticType.hat, 'hat_pizza', 'LAS_MONJAS');
		expect(cosmetics.getCosmeticRender).toHaveBeenCalledWith(4, CosmeticType.visor, 'visor_sun', 'LAS_MONJAS');
		expect(cosmetics.getCosmeticRender).toHaveBeenCalledWith(4, CosmeticType.skin, 'skin_hazmat', 'LAS_MONJAS');
		expect(cosmetics.getCosmeticRender).toHaveBeenCalledWith(4, CosmeticType.hatBack, 'hat_pizza', 'LAS_MONJAS');
	});

	it('hides every cosmetic while the player is dead', () => {
		const { component, cosmetics } = makeComponent(makePlayer({ isDead: true }));
		component.isDead = true;

		expect(component.getHat()).toBeUndefined();
		expect(component.getVisor()).toBeUndefined();
		expect(component.getSkin()).toBeUndefined();
		expect(component.getHatBack()).toBeUndefined();
		expect(cosmetics.getCosmeticRender).not.toHaveBeenCalled();
	});

	it('re-checks the view whenever the cosmetics version changes', () => {
		const { cosmetics, changeDetectorRef } = makeComponent();
		// The BehaviorSubject already emitted its current value on subscribe.
		changeDetectorRef.markForCheck.calls.reset();
		cosmetics.version$.next(1);
		expect(changeDetectorRef.markForCheck).toHaveBeenCalledTimes(1);
	});

	it('stops listening once destroyed', () => {
		const { component, cosmetics, changeDetectorRef } = makeComponent();
		changeDetectorRef.markForCheck.calls.reset();
		component.ngOnDestroy();
		cosmetics.version$.next(2);
		expect(changeDetectorRef.markForCheck).not.toHaveBeenCalled();
	});

	describe('getBodyImage', () => {
		it('uses the bundled body sprite for the player colour', () => {
			const { component } = makeComponent(makePlayer({ colorId: 3 }));
			expect(component.getBodyImage()).toBe('assets/avatar/players/3-alive.png');
		});

		it('falls back to color 0 for an out-of-range colour so the avatar is never broken', () => {
			const { component } = makeComponent(makePlayer({ colorId: 99 }));
			expect(component.getBodyImage()).toBe('assets/avatar/players/0-alive.png');
		});

		it('uses the ghost sprite when dead', () => {
			const { component } = makeComponent(makePlayer({ colorId: 3 }));
			component.isDead = true;
			expect(component.getBodyImage()).toBe('assets/avatar/players/3-dead.png');
		});
	});
});
