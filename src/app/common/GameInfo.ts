import { ModsType } from './Mods';

// --- verbatim from bettercrewlink (desktop) v3.2.1 src/common/GameInfo.ts ---
// Mobile fills appVersion/platform from its own runtime and leaves the game-side fields
// (broadcastVersion, offsetsVersion, is64bit, mod, mods) at defaults - it has no access to
// the Among Us process memory.
export interface GameInfo {
	appVersion: string;
	broadcastVersion: number;
	offsetsVersion: number;
	is64bit: boolean;
	platform: string;
	mod: ModsType;
	mods: string[];
}
