import { WebPlugin } from '@capacitor/core';

import type { BetterCrewlinkNativeServicePlugin } from './definitions';

export class BetterCrewlinkNativeServiceWeb extends WebPlugin implements BetterCrewlinkNativeServicePlugin {
  disconnect(): Promise<{ value: string; }> {
    console.log('disconnect');
    return Promise.resolve({ value: 'Disconnected' });
  }
  showTalking({ color, talking }: { color: number; talking: boolean; }): Promise<{ value: string; }> {
    console.log('showTalking', { color, talking });
    return Promise.resolve({ value: `Talking: ${talking}, Color: ${color}` });
  }
  showNotification(_options: { audiomuted: boolean; micmuted: boolean; overlayEnabled: boolean; }): Promise<{ value: string; }> {
    console.log('showNotification', _options);
    return Promise.resolve({ value: 'Notification shown' });
  }
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
