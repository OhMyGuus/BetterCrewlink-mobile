import { WebPlugin } from '@capacitor/core';

import type { BetterCrewlinkNativeServicePlugin } from './definitions';

export class BetterCrewlinkNativeServiceWeb extends WebPlugin implements BetterCrewlinkNativeServicePlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
