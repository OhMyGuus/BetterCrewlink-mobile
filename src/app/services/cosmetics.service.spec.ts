import { NgZone } from '@angular/core';
import { CosmeticType, CosmeticsService, HatCollection } from './cosmetics.service';

const HAT_BASE = 'https://cdn.jsdelivr.net/gh/OhMyGuus/BetterCrewLink-Hats@master/';

const COLLECTION: HatCollection = {
	NONE: {
		defaultWidth: '130%',
		defaultTop: '-78%',
		defaultLeft: '-14%',
		hats: {
			hat_pizza: { image: 'pizzaHat.png' },
			hat_withback: { image: 'front.png', back_image: 'back.png' },
			hat_rainbow: { image: 'rainbow.png', multi_color: true },
			hat_tuned: { image: 'tuned.png', top: '-10%', left: '-2%', width: '90%' },
			skin_hazmat: { image: 'Hazmat.png', hat_type: 'skins' },
			visor_sun: { image: 'sunVisor.png', hat_type: 'visors' },
		},
	},
	TOWN_OF_US: {
		defaultWidth: '100%',
		defaultTop: '-50%',
		defaultLeft: '-10%',
		hats: {
			hat_modonly: { image: 'modOnly.png' },
		},
	},
};

/** The service only needs `run` from NgZone; the browser's async events already schedule CD. */
function makeService(collection: HatCollection = COLLECTION): CosmeticsService {
	const service = new CosmeticsService({ run: <T>(fn: () => T): T => fn() } as unknown as NgZone);
	service.setHatCollection(collection);
	return service;
}

async function decodePng(dataUrl: string): Promise<Uint8ClampedArray> {
	const image = await new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('failed to decode PNG'));
		img.src = dataUrl;
	});
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height).data;
}

/** A 2x1 sprite whose pixels carry the fill (red) and shadow (blue) channels. */
function spriteDataUrl(): string {
	const canvas = document.createElement('canvas');
	canvas.width = 2;
	canvas.height = 1;
	const context = canvas.getContext('2d');
	context.fillStyle = 'rgb(0,0,255)';
	context.fillRect(0, 0, 1, 1);
	context.fillStyle = 'rgb(255,0,0)';
	context.fillRect(1, 0, 1, 1);
	return canvas.toDataURL('image/png');
}

describe('CosmeticsService', () => {
	it('resolves a string hat id to its CDN image and the collection dimensions', () => {
		const render = makeService().getCosmeticRender(0, CosmeticType.hat, 'hat_pizza');
		expect(render).toEqual({
			src: `${HAT_BASE}NONE/pizzaHat.png`,
			top: 'calc(22% + -78%)',
			left: 'calc(-14% - 6px)',
			width: '130%',
			zIndex: 4,
		});
	});

	it('honours per-hat dimension overrides', () => {
		const render = makeService().getCosmeticRender(0, CosmeticType.hat, 'hat_tuned');
		expect(render.top).toBe('calc(22% + -10%)');
		expect(render.left).toBe('calc(-2% - 6px)');
		expect(render.width).toBe('90%');
	});

	it('resolves the back layer behind the body', () => {
		const render = makeService().getCosmeticRender(0, CosmeticType.hatBack, 'hat_withback');
		expect(render.src).toBe(`${HAT_BASE}NONE/back.png`);
		expect(render.zIndex).toBe(1);
	});

	it('returns no back layer for hats without one', () => {
		expect(makeService().getCosmeticRender(0, CosmeticType.hatBack, 'hat_pizza')).toBeUndefined();
	});

	it('resolves skins and visors through the same collection', () => {
		const service = makeService();
		expect(service.getCosmeticRender(0, CosmeticType.skin, 'skin_hazmat').src).toBe(`${HAT_BASE}NONE/Hazmat.png`);
		expect(service.getCosmeticRender(0, CosmeticType.visor, 'visor_sun').src).toBe(`${HAT_BASE}NONE/sunVisor.png`);
		expect(service.getCosmeticRender(0, CosmeticType.visor, 'visor_sun').zIndex).toBe(3);
	});

	it('returns undefined for unknown, empty or missing ids', () => {
		const service = makeService();
		expect(service.getCosmeticRender(0, CosmeticType.hat, 'hat_does_not_exist')).toBeUndefined();
		expect(service.getCosmeticRender(0, CosmeticType.hat, '')).toBeUndefined();
		expect(service.getCosmeticRender(0, CosmeticType.hat, undefined)).toBeUndefined();
	});

	it('prefers mod-only hats inside that mod and falls back to NONE elsewhere', () => {
		const service = makeService();
		expect(service.getCosmeticRender(0, CosmeticType.hat, 'hat_modonly')).toBeUndefined();
		expect(service.getCosmeticRender(0, CosmeticType.hat, 'hat_modonly', 'TOWN_OF_US').src).toBe(
			`${HAT_BASE}TOWN_OF_US/modOnly.png`
		);
		// A hat present in NONE resolves from NONE even when a mod is active (desktop order).
		expect(service.getCosmeticRender(0, CosmeticType.hat, 'hat_pizza', 'TOWN_OF_US').src).toBe(
			`${HAT_BASE}NONE/pizzaHat.png`
		);
	});

	it('resolves nothing while the collection has not loaded', () => {
		const service = new CosmeticsService({ run: <T>(fn: () => T): T => fn() } as unknown as NgZone);
		spyOn(window, 'fetch').and.resolveTo({
			json: () => new Promise(() => undefined),
		} as unknown as Response);
		expect(service.getCosmeticRender(0, CosmeticType.hat, 'hat_pizza')).toBeUndefined();
	});

	it('recolours a multi_color sprite on the canvas and caches the result', async () => {
		const service = makeService();
		const tinted = await service.recolorSprite(spriteDataUrl(), '#C51111', '#7A0838');
		expect(tinted.startsWith('data:image/png')).toBeTrue();

		const pixels = await decodePng(tinted);
		// Pixel 0 is pure blue -> shadow; pixel 1 is pure red -> fill.
		expect([pixels[0], pixels[1], pixels[2]]).toEqual([0x7a, 0x08, 0x38]);
		expect([pixels[4], pixels[5], pixels[6]]).toEqual([0xc5, 0x11, 0x11]);
	});

	it('queues a multi_color recolour and serves it once ready', async () => {
		const service = makeService();
		const recolour = spyOn(service, 'recolorSprite').and.resolveTo('data:image/png;base64,TINTED');

		expect(service.getCosmeticRender(5, CosmeticType.hat, 'hat_rainbow')).toBeUndefined();
		expect(recolour).toHaveBeenCalledTimes(1);

		await new Promise((resolve) => setTimeout(resolve, 0));

		const render = service.getCosmeticRender(5, CosmeticType.hat, 'hat_rainbow');
		expect(render.src).toBe('data:image/png;base64,TINTED');
	});

	it('renders no recoloured hat for a colour outside the bundled palette', () => {
		const service = makeService();
		expect(service.getCosmeticRender(99, CosmeticType.hat, 'hat_rainbow')).toBeUndefined();
	});

	it('bumps version$ when a collection is installed', () => {
		const service = new CosmeticsService({ run: <T>(fn: () => T): T => fn() } as unknown as NgZone);
		const seen: number[] = [];
		service.version$.subscribe((version) => seen.push(version));
		service.setHatCollection(COLLECTION);
		expect(seen).toEqual([0, 1]);
	});

	describe('legacy numeric cosmetics', () => {
		it('renders a bundled numeric hat with its legacy offset', () => {
			const render = makeService().getCosmeticRender(3, CosmeticType.hat, '7');
			expect(render.src).toBe('assets/avatar/hats/7.png');
			expect(render.top).toBe('-28%');
			expect(render.left).toBe('-6px');
			expect(render.zIndex).toBe(4);
		});

		it('uses the per-colour sprite for bundled coloured hats', () => {
			expect(makeService().getCosmeticRender(5, CosmeticType.hat, '77').src).toBe('assets/avatar/hats/77-5.png');
			// Colors past 11 have no bundled variant, so the plain sprite is used.
			expect(makeService().getCosmeticRender(14, CosmeticType.hat, '77').src).toBe('assets/avatar/hats/77.png');
		});

		it('puts a bundled back-layer hat behind the body', () => {
			expect(makeService().getCosmeticRender(0, CosmeticType.hat, '4').zIndex).toBe(1);
		});

		it('renders a bundled numeric skin and no legacy back/visor layer', () => {
			const service = makeService();
			const skin = service.getCosmeticRender(0, CosmeticType.skin, '9');
			expect(skin.src).toBe('assets/avatar/skins/9.png');
			expect(skin.zIndex).toBe(3);
			expect(service.getCosmeticRender(0, CosmeticType.hatBack, '9')).toBeUndefined();
			expect(service.getCosmeticRender(0, CosmeticType.visor, '9')).toBeUndefined();
		});
	});
});
