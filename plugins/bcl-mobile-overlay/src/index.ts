import { registerPlugin } from '@capacitor/core';

import type { BetterCrewlinkNativeServicePlugin } from './definitions';

const BetterCrewlinkNativeService = registerPlugin<BetterCrewlinkNativeServicePlugin>('BetterCrewlinkNativeService', {
  web: () => import('./web').then((m) => new m.BetterCrewlinkNativeServiceWeb()),
});

export * from './definitions';
export { BetterCrewlinkNativeService };
