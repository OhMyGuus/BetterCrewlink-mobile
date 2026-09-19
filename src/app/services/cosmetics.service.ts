import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ModsType } from '../common/Mods';
import { MOBILE_PLAYERCOLORS } from '../common/playerColors';
import { recolorCosmeticPixels } from '../lib/recolorCosmetic';

// Same collection desktop's renderer fetches (bettercrewlink/src/renderer/lib/cosmetics.ts).
// Hats, skins and visors all live in its per-mod files, keyed by the string asset id the game
// state now carries - numeric ids only survive for very old hosts.
const HAT_COLLECTION_URL = 'https://cdn.jsdelivr.net/gh/OhMyGuus/BetterCrewLink-Hats@master/';

export enum CosmeticType {
	hat,
	hatBack,
	skin,
	visor,
}

export interface CosmeticRender {
	/** Resolved image URL (CDN, or a data URL for recoloured sprites). */
	src: string;
	top: string;
	left: string;
	width: string;
	zIndex: number;
}

interface HatEntry {
	image?: string;
	back_image?: string;
	top?: string;
	width?: string;
	left?: string;
	multi_color?: boolean;
	hat_type?: string;
	asset_name?: string;
}

interface HatModCollection {
	defaultWidth: string;
	defaultTop: string;
	defaultLeft: string;
	hats: Record<string, HatEntry>;
}

export type HatCollection = Record<string, HatModCollection>;

interface ResolvedHat {
	mod: string;
	entry: HatEntry;
}

/** Promise wrapper around an anonymous-CORS image load, so the canvas can read its pixels. */
function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.crossOrigin = 'anonymous';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Failed to load ${url}`));
		image.src = url;
	});
}

/** Sprites are painted above the body except a hat's back layer, which sits behind it. */
const COSMETIC_Z_INDEX: Record<CosmeticType, number> = {
	[CosmeticType.hat]: 4,
	[CosmeticType.hatBack]: 1,
	[CosmeticType.skin]: 3,
	[CosmeticType.visor]: 3,
};

// --- Legacy numeric cosmetics -------------------------------------------------------------
// Older hosts (pre string ids) sent plain integers, which the app rendered from the bundled
// `assets/avatar/hats|skins` sprites with hand-tuned offsets. Desktop dropped all of this; we
// keep it as a fallback so those hosts still render something instead of nothing.
const LEGACY_HAT_OFFSETS: Record<number, number | undefined> = {
	7: -50,
	21: -50,
	28: -50,
	35: -50,
	77: -50,
	90: -50,
	94: -15,
	103: -50,
};

/** Hats bundled in per-colour variants; only colors 0-11 have sprite files. */
const LEGACY_COLORED_HATS = [77, 90];

/** Hats whose bundled sprite belongs behind the body. */
const LEGACY_BACK_LAYER_HATS = new Set([39, 4, 6, 15, 29, 42, 75, 85, 102, 105, 106, 104, 103]);

/**
 * Resolves a player's hat/skin/visor id into the image and placement desktop's CosmeticsService
 * equivalent produces. Desktop runs this in React hooks and recolours sprites on its main
 * process; here it is a plain Angular service that recolours on an offscreen canvas instead.
 */
@Injectable({
	providedIn: 'root',
})
export class CosmeticsService {
	/** Bumped whenever hats finish loading or a recoloured sprite becomes available, so OnPush
	 * avatars know to re-read their cosmetics. */
	readonly version$ = new BehaviorSubject<number>(0);

	private hatCollection: HatCollection = {};
	private hatCollectionLoaded = false;
	private hatsRequested = false;
	private readonly resolvedCache = new Map<string, ResolvedHat | null>();
	private readonly tintCache = new Map<string, string>();
	private readonly tintPending = new Set<string>();
	private readonly tintFailed = new Set<string>();

	constructor(private zone: NgZone) {}

	get hatsLoaded(): boolean {
		return this.hatCollectionLoaded;
	}

	/** Installs a collection directly (tests, or a future bundled copy) and skips the network. */
	setHatCollection(collection: HatCollection): void {
		this.hatCollection = collection;
		this.hatCollectionLoaded = true;
		this.hatsRequested = false;
		this.resolvedCache.clear();
		this.bump();
	}

	/** Fetches the shared hat collection once; a failure leaves the legacy fallback in place and
	 * allows a later retry. */
	initializeHats(): void {
		if (this.hatCollectionLoaded || this.hatsRequested) {
			return;
		}
		this.hatsRequested = true;
		fetch(`${HAT_COLLECTION_URL}hats.json`)
			.then((response) => response.json() as Promise<HatCollection>)
			.then((data) => {
				this.hatCollection = data;
				this.hatCollectionLoaded = true;
				this.hatsRequested = false;
				this.resolvedCache.clear();
				this.bump();
			})
			.catch((error) => {
				console.error('Failed to load hats.json', error);
				this.hatsRequested = false;
			});
	}

	/**
	 * Desktop's `getCosmetic` + `getHatDementions` in one call: returns everything the avatar
	 * needs to draw a cosmetic, or `undefined` when the id is unknown/missing (the caller simply
	 * renders no element, leaving the base avatar visible).
	 *
	 * A `multi_color` sprite that hasn't been recoloured yet returns `undefined` while the canvas
	 * work is queued; `version$` fires when it is ready and the avatar re-renders.
	 */
	getCosmeticRender(colorId: number, type: CosmeticType, id: string | undefined, mod: ModsType = 'NONE'): CosmeticRender | undefined {
		this.initializeHats();
		if (!id) {
			return undefined;
		}

		const resolved = this.resolveHat(id, mod);
		if (resolved) {
			const image = type === CosmeticType.hatBack ? resolved.entry.back_image : resolved.entry.image;
			if (!image) {
				return undefined;
			}
			const url = `${HAT_COLLECTION_URL}${resolved.mod}/${image}`;
			const src = resolved.entry.multi_color ? this.getTintedSrc(url, colorId) : url;
			if (!src) {
				return undefined;
			}
			return {
				src,
				top: `calc(22% + ${resolved.entry.top})`,
				left: `calc(${resolved.entry.left} - 6px)`,
				width: resolved.entry.width,
				zIndex: COSMETIC_Z_INDEX[type],
			};
		}

		return this.getLegacyRender(colorId, type, id);
	}

	/** Looks the id up in the unmodded collection first, then the lobby's mod (desktop order). */
	private resolveHat(id: string, mod: ModsType): ResolvedHat | undefined {
		if (!this.hatCollectionLoaded) {
			return undefined;
		}
		const cacheKey = `${id}|${mod}`;
		const cached = this.resolvedCache.get(cacheKey);
		if (cached !== undefined) {
			return cached ?? undefined;
		}

		let resolved: ResolvedHat | undefined;
		const candidates = mod === 'NONE' ? ['NONE'] : ['NONE', mod];
		for (const candidate of candidates) {
			const collection = this.hatCollection[candidate];
			const hat = collection?.hats?.[id];
			if (hat) {
				resolved = {
					mod: candidate,
					entry: {
						...hat,
						top: hat.top ?? collection.defaultTop,
						width: hat.width ?? collection.defaultWidth,
						left: hat.left ?? collection.defaultLeft,
					},
				};
				break;
			}
		}

		this.resolvedCache.set(cacheKey, resolved ?? null);
		return resolved;
	}

	/**
	 * Returns the recoloured data URL for a `multi_color` sprite, queueing the canvas pass on
	 * first request. Colors outside our palette (desktop gets the extras from game memory) get no
	 * hat rather than a wrongly tinted one - the same net result desktop has when its generator
	 * can't find a colour pair.
	 */
	private getTintedSrc(url: string, colorId: number): string | undefined {
		const palette = MOBILE_PLAYERCOLORS[colorId];
		if (!palette) {
			return undefined;
		}
		const [fill, shadow] = palette;
		const cacheKey = `${url}|${fill}|${shadow}`;
		const cached = this.tintCache.get(cacheKey);
		if (cached) {
			return cached;
		}
		if (this.tintPending.has(cacheKey) || this.tintFailed.has(cacheKey)) {
			return undefined;
		}
		this.tintPending.add(cacheKey);
		void this.recolorSprite(url, fill, shadow).then((src) => {
			this.zone.run(() => {
				this.tintPending.delete(cacheKey);
				if (src) {
					this.tintCache.set(cacheKey, src);
				} else {
					this.tintFailed.add(cacheKey);
				}
				this.bump();
			});
		});
		return undefined;
	}

	/**
	 * Recolours one sprite on an offscreen canvas and resolves its PNG data URL, or `undefined`
	 * when the image can't be read (offline, or a CDN response that forbids canvas access).
	 * Public so it can be exercised directly with a local data URL.
	 */
	async recolorSprite(url: string, fill: string, shadow: string): Promise<string | undefined> {
		try {
			const image = await loadImage(url);
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) {
				throw new Error('2d canvas context unavailable');
			}
			context.drawImage(image, 0, 0);
			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			recolorCosmeticPixels(imageData.data, fill, shadow);
			context.putImageData(imageData, 0, 0);
			return canvas.toDataURL('image/png');
		} catch (error) {
			console.warn('Failed to recolour cosmetic', url, error);
			return undefined;
		}
	}

	/** Pre-string-id hosts: render the bundled numeric sprites instead of the CDN collection. */
	private getLegacyRender(colorId: number, type: CosmeticType, id: string): CosmeticRender | undefined {
		const numericId = Number(id);
		if (!Number.isInteger(numericId) || numericId <= 0) {
			return undefined;
		}

		switch (type) {
			case CosmeticType.hat: {
				const colored = LEGACY_COLORED_HATS.includes(numericId) && colorId >= 0 && colorId <= 11;
				const file = colored ? `${numericId}-${colorId}` : `${numericId}`;
				return {
					src: `assets/avatar/hats/${file}.png`,
					top: `${(LEGACY_HAT_OFFSETS[numericId] ?? -33) + 22}%`,
					left: '-6px',
					width: '100%',
					zIndex: LEGACY_BACK_LAYER_HATS.has(numericId) ? 1 : 4,
				};
			}
			case CosmeticType.skin:
				return {
					src: `assets/avatar/skins/${numericId}.png`,
					top: 'calc(33% + 22%)',
					left: '-7px',
					width: '105%',
					zIndex: 3,
				};
			// A legacy hat is a single front sprite, and there are no bundled visors.
			case CosmeticType.hatBack:
			case CosmeticType.visor:
				return undefined;
		}
	}

	private bump(): void {
		this.version$.next(this.version$.value + 1);
	}
}
