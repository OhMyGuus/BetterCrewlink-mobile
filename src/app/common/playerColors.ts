// Ported from bettercrewlink (desktop) src/common/playerColors.ts. Desktop reads the full
// colour table straight out of Among Us memory and feeds its avatar generator with it; mobile
// has no process access, so CosmeticsService needs a static table to tint the multi-colour
// (red/blue/green-channel encoded) hat and skin sprites desktop's `generate://` protocol tints.

export const DEFAULT_PLAYERCOLORS: string[][] = [
	['#C51111', '#7A0838'],
	['#132ED1', '#09158E'],
	['#117F2D', '#0A4D2E'],
	['#ED54BA', '#AB2BAD'],
	['#EF7D0D', '#B33E15'],
	['#F5F557', '#C38823'],
	['#3F474E', '#1E1F26'],
	['#FFFFFF', '#8394BF'],
	['#6B2FBB', '#3B177C'],
	['#71491E', '#5E2615'],
	['#38FEDC', '#24A8BE'],
	['#50EF39', '#15A742'],
];

/**
 * The original twelve colours plus the six extra ones our bundled body art covers
 * (`assets/avatar/players/<id>-alive.png`). Each pair was sampled from that sprite - brighter
 * body colour first (fill), darker shading second (shadow) - so a recoloured hat matches the
 * body mobile actually draws for the id. Desktop learns the same six from game memory instead.
 */
export const MOBILE_PLAYERCOLORS: string[][] = [
	...DEFAULT_PLAYERCOLORS,
	['#5F1D2E', '#410F1A'],
	['#ECC0D3', '#DE92B3'],
	['#F0E7A8', '#D2BC89'],
	['#758593', '#465664'],
	['#918877', '#51413E'],
	['#D76464', '#B44362'],
];
