// Web port of the recolouring desktop does on its main process (`colorImage` in
// bettercrewlink/src/main/avatarGenerator.ts). Among Us encodes the target player colour across
// the channels of a `multi_color` hat/skin/visor sprite: red carries the fill colour, blue the
// shadow colour and green a fixed highlight. Desktop rewrites those pixels and serves the result
// over its `generate://` protocol; a browser has no such protocol, so CosmeticsService draws the
// sprite onto a canvas and hands its pixels to `recolorCosmeticPixels` instead.
//
// The maths is deliberately identical to desktop's (which uses the `color` npm package's
// `mix` - a plain linear interpolation between two RGB triples) so a hat tinted here looks the
// same as one tinted by the desktop client.

/** Linear RGB interpolation: weight 0 returns `from`, weight 1 returns `to`. */
function mix(from: number, to: number, weight: number): number {
	return from * (1 - weight) + to * weight;
}

/** Desktop's rgb2hsv; hue in degrees, saturation normalised, value left in 0-255 like desktop. */
function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
	const v = Math.max(r, g, b);
	const c = v - Math.min(r, g, b);
	const h = c && (v === r ? (g - b) / c : v === g ? 2 + (b - r) / c : 4 + (r - g) / c);
	return [60 * (h < 0 ? h + 6 : h), v && c / v, v];
}

/** Circular hue distance test, matching desktop's `isBetween` exactly. */
function isBetween(hue: number, target: number, maxDifference: number): boolean {
	return 180 - Math.abs(Math.abs(hue - target) - 180) < maxDifference;
}

/** The fixed glass/highlight tint the source sprites encode in their green channel. */
const HIGHLIGHT: [number, number, number] = [0x9a, 0xca, 0xd5];

export function hexToRgb(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.replace('#', ''), 16);
	return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/**
 * Rewrites the colour-carrying pixels of an RGBA buffer in place. Pixels that don't look like the
 * encoded colour channels (low saturation, or a hue outside the red/blue/green windows desktop
 * accepts) are left untouched, so outlines and highlights survive.
 */
export function recolorCosmeticPixels(data: Uint8ClampedArray, fill: string, shadow: string): void {
	const [fillR, fillG, fillB] = hexToRgb(fill);
	const [shadowR, shadowG, shadowB] = hexToRgb(shadow);
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const hsv = rgb2hsv(r, g, b);
		if (
			hsv[1] > 0.4 &&
			(isBetween(hsv[0], 240, 30) || isBetween(hsv[0], 0, 100) || isBetween(hsv[0], 120, 40))
		) {
			const shadowMixR = mix(0, shadowR, b / 255);
			const shadowMixG = mix(0, shadowG, b / 255);
			const shadowMixB = mix(0, shadowB, b / 255);

			const fillMixR = mix(shadowMixR, fillR, r / 255);
			const fillMixG = mix(shadowMixG, fillG, r / 255);
			const fillMixB = mix(shadowMixB, fillB, r / 255);

			data[i] = mix(fillMixR, HIGHLIGHT[0], g / 255);
			data[i + 1] = mix(fillMixG, HIGHLIGHT[1], g / 255);
			data[i + 2] = mix(fillMixB, HIGHLIGHT[2], g / 255);
		}
	}
}
