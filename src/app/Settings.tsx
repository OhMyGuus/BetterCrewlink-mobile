import React, {
	ReactChild,
	useContext,
	useEffect,
	useReducer,
	useState,
} from 'react';
import {
	SettingsContext,
	GameStateContext,
	LobbySettingsContext
} from './contexts';
import { GameState } from './services/AmongUsState';
import { isHttpUri, isHttpsUri } from 'valid-url';
import { ISettings, ILobbySettings } from './services/smallInterfaces';
import {
	IonContent,
	IonButton,
	IonText,
	IonModal,
	IonAlert,
	IonFooter,
	IonInput
} from '@ionic/react';
import Cookies from 'universal-cookie';

export interface SettingsProps {
	open: boolean;
	onClose: () => void;
}

const saveSingleSettings = (key: string, val: unknown) => {
	const cookies = new Cookies();
	cookies.set(key, val, { path: '/' });
}

const saveSettings = (settings: ISettings) => {
	Object.entries(settings).forEach((item) => {
		saveSingleSettings(item[0], item[1]);
	})
}

export const settingsReducer = (
	state: ISettings,
	action: {
		type: 'set' | 'setOne' | 'setLobbySetting';
		action: [string, unknown] | ISettings;
	}
): ISettings => {
	if (action.type === 'set') {
		saveSettings(action.action as ISettings);
		return action.action as ISettings;
	}
	const v = action.action as [string, unknown];

	saveSingleSettings(v[0], v[1]);
	return {
		...state,
		[v[0]]: v[1],
	};
};

export const lobbySettingsReducer = (
	state: ILobbySettings,
	action: {
		type: 'set' | 'setOne';
		action: [string, unknown] | ILobbySettings;
	}
): ILobbySettings => {
	if (action.type === 'set') return action.action as ILobbySettings;
	const v = action.action as [string, unknown];
	return {
		...state,
		[v[0]]: v[1],
	};
};

interface MediaDevice {
	id: string;
	kind: MediaDeviceKind;
	label: string;
}

function validateServerUrl(uri: string): boolean {
	try {
		if (!isHttpUri(uri) && !isHttpsUri(uri)) return false;
		const url = new URL(uri);
		if (url.hostname === 'discord.gg') return false;
		if (url.pathname !== '/') return false;
		return true;
	} catch (_) {
		return false;
	}
}

type URLInputProps = {
	initialURL: string;
	onValidURL: (url: string) => void;
	className: string;
};

const URLInput: React.FC<URLInputProps> = function ({
	initialURL,
	onValidURL,
	className,
}: URLInputProps) {
	const [isValidURL, setURLValid] = useState(true);
	const [currentURL, setCurrentURL] = useState(initialURL);
	const [open, setOpen] = useState(false);
	const [alertOpen, setAlertOpen] = useState(false);

	useEffect(() => {
		setCurrentURL(initialURL);
	}, [initialURL]);

	function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
		const url = event.target.value.trim();
		setCurrentURL(url);
		if (validateServerUrl(url)) {
			setURLValid(true);
		} else {
			setURLValid(false);
		}
	}

	return (
		<>
			<IonButton color="secondary" onClick={() => setAlertOpen(true)}>
				Change Voice Server
			</IonButton>
			<IonModal isOpen={open}>
				<IonText>Change Voice Server</IonText>
				<IonContent className={className}>
					<IonInput
						spellCheck={false}
						value={currentURL}
						color="primary"
					/>
					<IonAlert
						isOpen={alertOpen}
						onDidDismiss={() => {setAlertOpen(false); setOpen(true)}}
						header="Change Server"
						message="This option is for advanced users only. Other servers can steal your info or crash BetterCrewlink."
						buttons={['OK']}
					/>
					<IonButton
						color="primary"
						onClick={() => {
							setOpen(false);
							setURLValid(true);
							onValidURL('https://bettercrewl.ink');
						}}
					>
						Reset to default
					</IonButton>
				</IonContent>
				<IonFooter>
					<IonButton
						color="primary"
						onClick={() => {
							setURLValid(true);
							setOpen(false);
							setCurrentURL(initialURL);
						}}
					>
						Cancel
					</IonButton>
					<IonButton
						disabled={!isValidURL}
						color="primary"
						onClick={() => {
							setOpen(false);
							let url = currentURL;
							if (url.endsWith('/')) url = url.substring(0, url.length - 1);
							onValidURL(url);
						}}
					>
						Confirm
					</IonButton>
				</IonFooter>
			</IonModal>
		</>
	);
};

const Settings: React.FC<SettingsProps> = function ({
	open,
	onClose,
}: SettingsProps) {
	const [settings, setSettings] = useContext(SettingsContext);
	const gameState = useContext(GameStateContext);
	const [lobbySettings, setLobbySettings] = useContext(LobbySettingsContext);
	const [unsavedCount, setUnsavedCount] = useState(0);
	const unsaved = unsavedCount > 2;
	/**
	useEffect(() => {
		setSettings({
			type: 'set',
			action: store.store,
		});
		setLobbySettings({
			type: 'set',
			action: store.get('localLobbySettings'),
		});
	}, []);
	*/

	const [devices, setDevices] = useState<MediaDevice[]>([]);
	const [_, updateDevices] = useReducer((state) => state + 1, 0);
	useEffect(() => {
		navigator.mediaDevices.enumerateDevices().then((devices) =>
			setDevices(
				devices.map((d) => {
					let label = d.label;
					if (d.deviceId === 'default') {
						label = 'Default';
					} else {
						const match = /(.+?)\)/.exec(d.label);
						if (match && match[1]) label = match[1] + ')';
					}
					return {
						id: d.deviceId,
						kind: d.kind,
						label,
					};
				})
			)
		);
	}, [_]);

	const microphones = devices.filter((d) => d.kind === 'audioinput');
	const speakers = devices.filter((d) => d.kind === 'audiooutput');

	const isInMenuOrLobby =
		gameState?.gameState === GameState.LOBBY ||
		gameState?.gameState === GameState.MENU;
	const canChangeLobbySettings =
		gameState?.gameState === GameState.MENU ||
		(gameState?.isHost && gameState?.gameState === GameState.LOBBY);

	return (
		<IonText>Settings</IonText>
	);
};

export default Settings;