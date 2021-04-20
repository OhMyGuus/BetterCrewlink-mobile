import React, { createContext } from 'react';
import { AmongUsState } from './services/AmongUsState';
import { SettingsService } from './services/settings.service';

type SettingsContextValue = [
	SettingsService,
	React.Dispatch<{
		type: 'set' | 'setOne' | 'setLobbySetting';
		action: SettingsService | [string, unknown];
	}>
];

export const GameStateContext = createContext<AmongUsState>({} as AmongUsState);
export const SettingsContext = createContext<SettingsContextValue>(
	(null as unknown) as SettingsContextValue
);