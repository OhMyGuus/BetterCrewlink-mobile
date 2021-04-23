import React, { createContext } from 'react';
import { AmongUsState } from './services/AmongUsState';
import { ISettings, ILobbySettings } from './services/smallInterfaces';

type SettingsContextValue = [
	ISettings,
	React.Dispatch<{
		type: 'set' | 'setOne';
		action: ISettings | [string, unknown];
	}>
];
type LobbySettingsContextValue = [
	ILobbySettings,
	React.Dispatch<{
		type: 'set' | 'setOne';
		action: ILobbySettings | [string, unknown];
	}>
];

export const GameStateContext = createContext<AmongUsState>({} as AmongUsState);
export const SettingsContext = createContext<SettingsContextValue>(
	(null as unknown) as SettingsContextValue
);
export const LobbySettingsContext = createContext<LobbySettingsContextValue>(
	(null as unknown) as LobbySettingsContextValue
);