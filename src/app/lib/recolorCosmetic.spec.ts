import { hexToRgb, recolorCosmeticPixels } from './recolorCosmetic';

describe('recolorCosmetic', () => {
	function pixel(r: number, g: number, b: number, a = 255): Uint8ClampedArray {
		return new Uint8ClampedArray([r, g, b, a]);
	}
	function rgb(data: Uint8ClampedArray): number[] {
		return [data[0], data[1], data[2]];
	}

	it('parses hex colours, with or without the leading hash', () => {
		expect(hexToRgb('#C51111')).toEqual([0xc5, 0x11, 0x11]);
		expect(hexToRgb('7A0838')).toEqual([0x7a, 0x08, 0x38]);
	});

	it('maps a pure red (fill channel) pixel onto the player colour', () => {
		const data = pixel(255, 0, 0);
		recolorCosmeticPixels(data, '#C51111', '#7A0838');
		expect(rgb(data)).toEqual([0xc5, 0x11, 0x11]);
	});

	it('maps a pure blue (shadow channel) pixel onto the shadow colour', () => {
		const data = pixel(0, 0, 255);
		recolorCosmeticPixels(data, '#C51111', '#7A0838');
		expect(rgb(data)).toEqual([0x7a, 0x08, 0x38]);
	});

	it('maps a pure green (highlight channel) pixel onto the fixed highlight', () => {
		const data = pixel(0, 255, 0);
		recolorCosmeticPixels(data, '#C51111', '#7A0838');
		expect(rgb(data)).toEqual([0x9a, 0xca, 0xd5]);
	});

	it('blends channels the same way desktop does', () => {
		// Red at half weight: start black, mix in the black shadow (blue = 0), then mix the white
		// fill in at r/255 = 0.502, then no highlight (green = 0) -> ~128.
		const data = pixel(128, 0, 0);
		recolorCosmeticPixels(data, '#FFFFFF', '#000000');
		expect(data[0]).toBe(128);
	});

	it('leaves low-saturation pixels (outlines, glass) untouched', () => {
		const white = pixel(255, 255, 255);
		recolorCosmeticPixels(white, '#C51111', '#7A0838');
		expect(rgb(white)).toEqual([255, 255, 255]);

		const nearGray = pixel(120, 121, 119);
		recolorCosmeticPixels(nearGray, '#C51111', '#7A0838');
		expect(rgb(nearGray)).toEqual([120, 121, 119]);
	});

	it('leaves hues outside desktop’s red/green/blue windows (e.g. cyan) untouched', () => {
		const cyan = pixel(0, 255, 255);
		recolorCosmeticPixels(cyan, '#C51111', '#7A0838');
		expect(rgb(cyan)).toEqual([0, 255, 255]);
	});

	it('never touches the alpha channel', () => {
		const data = pixel(255, 0, 0, 77);
		recolorCosmeticPixels(data, '#C51111', '#7A0838');
		expect(data[3]).toBe(77);
	});

	it('rewrites every encoded pixel in a multi-pixel buffer', () => {
		const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
		recolorCosmeticPixels(data, '#50EF39', '#15A742');
		expect([data[0], data[1], data[2]]).toEqual([0x50, 0xef, 0x39]);
		expect([data[4], data[5], data[6]]).toEqual([0x15, 0xa7, 0x42]);
		expect([data[8], data[9], data[10]]).toEqual([255, 255, 255]);
	});
});
