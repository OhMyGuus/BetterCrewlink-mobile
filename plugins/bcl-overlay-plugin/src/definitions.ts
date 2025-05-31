export interface BetterCrewlinkNativeServicePlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
