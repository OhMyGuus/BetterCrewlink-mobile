export interface BetterCrewlinkNativeServicePlugin {
  disconnect(): Promise<{ value: string }>;
  showTalking(options: { color: number, talking: boolean }): Promise<{ value: string }>;
  showNotification(options: { audiomuted: boolean, micmuted: boolean, overlayEnabled: boolean }): Promise<{ value: string }>;

}
