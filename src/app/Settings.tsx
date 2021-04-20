import React, {
	ReactChild,
	useContext,
	useEffect,
	useReducer,
	useState,
} from 'react';
import {
	GameStateContext,
	SettingsContext
} from './contexts';
import {

} from '@ionic/react';

interface DisabledTooltipProps {
	disabled: boolean;
	title: string;
	children: ReactChild;
}

const DisabledTooltip: React.FC<DisabledTooltipProps> = function ({
	disabled,
	children,
	title,
}: DisabledTooltipProps) {
	if (disabled)
		return (
			<Tooltip placement="top" arrow title={title}>
				<span>{children}</span>
			</Tooltip>
		);
	else return <>{children}</>;
};

const Settings: React.FC<SettingsProps> = function ({
	open,
	onClose,
}: SettingsProps) {
	const classes = useStyles({ open });
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

	useEffect(() => {
		setUnsavedCount((s) => s + 1);
	}, [
		settings.microphone,
		settings.speaker,
		settings.serverURL,
		settings.enableSpatialAudio,
	]);

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

	const setShortcut = (ev: React.KeyboardEvent, shortcut: string) => {
		let k = ev.key;
		if (k.length === 1) k = k.toUpperCase();
		else if (k.startsWith('Arrow')) k = k.substring(5);
		if (k === ' ') k = 'Space';

		if (k === 'Control' || k === 'Alt' || k === 'Shift')
			k = (ev.location === 1 ? 'L' : 'R') + k;

		if (/^[0-9A-Z]$/.test(k) || /^F[0-9]{1,2}$/.test(k) || keys.has(k)) {
			setSettings({
				type: 'setOne',
				action: [shortcut, k],
			});
		}
	};

	const setMouseShortcut = (
		ev: React.MouseEvent<HTMLDivElement>,
		shortcut: string
	) => {
		if (ev.button > 2) {
			// this makes our button start at 1 instead of 0
			// React Mouse event starts at 0, but IOHooks starts at 1
			const k = `MouseButton${ev.button + 1}`;
			setSettings({
				type: 'setOne',
				action: [shortcut, k],
			});
		}
	};

	const microphones = devices.filter((d) => d.kind === 'audioinput');
	const speakers = devices.filter((d) => d.kind === 'audiooutput');
	const [localDistance, setLocalDistance] = useState(
		settings.localLobbySettings.maxDistance
	);
	useEffect(() => {
		setLocalDistance(settings.localLobbySettings.maxDistance);
	}, [settings.localLobbySettings.maxDistance]);

	const isInMenuOrLobby =
		gameState?.gameState === GameState.LOBBY ||
		gameState?.gameState === GameState.MENU;
	const canChangeLobbySettings =
		gameState?.gameState === GameState.MENU ||
		(gameState?.isHost && gameState?.gameState === GameState.LOBBY);

	return (
		<Box className={classes.root}>
			<div className={classes.header}>
				<IconButton
					className={classes.back}
					size="small"
					onClick={() => {
						setSettings({
							type: 'setOne',
							action: ['localLobbySettings', lobbySettings],
						});
						if (unsaved) {
							onClose();
							location.reload();
						} else onClose();
					}}
				>
					<ChevronLeft htmlColor="#777" />
				</IconButton>
				<Typography variant="h6">Settings</Typography>
			</div>
			<div className={classes.scroll}>
				{/* Lobby Settings */}
				<div>
					<Typography variant="h6">Lobby Settings</Typography>
					<Typography gutterBottom>
						Voice Distance:{' '}
						{canChangeLobbySettings ? localDistance : lobbySettings.maxDistance}
					</Typography>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={
							isInMenuOrLobby
								? 'Only the game host can change this!'
								: 'You can only change this in the lobby!'
						}
					>
						<Slider
							disabled={!canChangeLobbySettings}
							value={
								canChangeLobbySettings
									? localDistance
									: lobbySettings.maxDistance
							}
							min={1}
							max={10}
							step={0.1}
							onChange={(_, newValue: number | number[]) => {
								setLocalDistance(newValue as number);
							}}
							onChangeCommitted={(_, newValue: number | number[]) => {
								setSettings({
									type: 'setLobbySetting',
									action: ['maxDistance', newValue as number],
								});
								if (gameState?.isHost) {
									setLobbySettings({
										type: 'setOne',
										action: ['maxDistance', newValue as number],
									});
								}
							}}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={
							isInMenuOrLobby
								? 'Only the game host can change this!'
								: 'You can only change this in the lobby!'
						}
					>
						<FormControlLabel
							label="Impostors Hear Dead"
							disabled={!canChangeLobbySettings}
							checked={
								canChangeLobbySettings
									? settings.localLobbySettings.haunting
									: lobbySettings.haunting
							}
							onChange={(_, checked: boolean) => {
								setSettings({
									type: 'setLobbySetting',
									action: ['haunting', checked],
								});
								if (gameState?.isHost) {
									setLobbySettings({
										type: 'setOne',
										action: ['haunting', checked],
									});
								}
							}}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={
							isInMenuOrLobby
								? 'Only the game host can change this!'
								: 'You can only change this in the lobby!'
						}
					>
						<FormControlLabel
							label="Hear Impostors In Vents"
							disabled={!canChangeLobbySettings}
							checked={
								canChangeLobbySettings
									? settings.localLobbySettings.hearImpostorsInVents
									: lobbySettings.hearImpostorsInVents
							}
							onChange={(_, checked: boolean) => {
								setSettings({
									type: 'setLobbySetting',
									action: ['hearImpostorsInVents', checked],
								});
								if (gameState?.isHost) {
									setLobbySettings({
										type: 'setOne',
										action: ['hearImpostorsInVents', checked],
									});
								}
							}}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
					<DisabledTooltip
						disabled={!canChangeLobbySettings}
						title={
							isInMenuOrLobby
								? 'Only the game host can change this!'
								: 'You can only change this in the lobby!'
						}
					>
						<FormControlLabel
							label="Comms Sabotage Disables Voice"
							disabled={!canChangeLobbySettings}
							checked={
								canChangeLobbySettings
									? settings.localLobbySettings.commsSabotage
									: lobbySettings.commsSabotage
							}
							onChange={(_, checked: boolean) => {
								setSettings({
									type: 'setLobbySetting',
									action: ['commsSabotage', checked],
								});
								if (gameState?.isHost) {
									setLobbySettings({
										type: 'setOne',
										action: ['commsSabotage', checked],
									});
								}
							}}
							control={<Checkbox />}
						/>
					</DisabledTooltip>
				</div>
				<Divider />
				<Typography variant="h6">Audio</Typography>
				<TextField
					select
					label="Microphone"
					variant="outlined"
					color="secondary"
					value={settings.microphone}
					className={classes.shortcutField}
					SelectProps={{ native: true }}
					InputLabelProps={{ shrink: true }}
					onChange={(ev) => {
						setSettings({
							type: 'setOne',
							action: ['microphone', ev.target.value],
						});
					}}
					onClick={updateDevices}
				>
					{microphones.map((d) => (
						<option key={d.id} value={d.id}>
							{d.label}
						</option>
					))}
				</TextField>
				{open && <MicrophoneSoundBar microphone={settings.microphone} />}
				<TextField
					select
					label="Speaker"
					variant="outlined"
					color="secondary"
					value={settings.speaker}
					className={classes.shortcutField}
					SelectProps={{ native: true }}
					InputLabelProps={{ shrink: true }}
					onChange={(ev) => {
						setSettings({
							type: 'setOne',
							action: ['speaker', ev.target.value],
						});
					}}
					onClick={updateDevices}
				>
					{speakers.map((d) => (
						<option key={d.id} value={d.id}>
							{d.label}
						</option>
					))}
				</TextField>
				{open && <TestSpeakersButton speaker={settings.speaker} />}
				<RadioGroup
					value={settings.pushToTalk}
					onChange={(ev) => {
						setSettings({
							type: 'setOne',
							action: ['pushToTalk', ev.target.value === 'true'],
						});
					}}
				>
					<FormControlLabel
						label="Voice Activity"
						value={false}
						control={<Radio />}
					/>
					<FormControlLabel
						label="Push To Talk"
						value={true}
						control={<Radio />}
					/>
				</RadioGroup>
				<Divider />
				<Typography variant="h6">Keyboard Shortcuts</Typography>
				<Grid container spacing={1}>
					<Grid item xs={12}>
						<TextField
							fullWidth
							spellCheck={false}
							color="secondary"
							label="Push To Talk"
							value={settings.pushToTalkShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'pushToTalkShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'pushToTalkShortcut');
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							spellCheck={false}
							color="secondary"
							label="Mute"
							value={settings.muteShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'muteShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'muteShortcut');
							}}
						/>
					</Grid>
					<Grid item xs={6}>
						<TextField
							spellCheck={false}
							color="secondary"
							label="Deafen"
							value={settings.deafenShortcut}
							className={classes.shortcutField}
							variant="outlined"
							onKeyDown={(ev) => {
								setShortcut(ev, 'deafenShortcut');
							}}
							onMouseDown={(ev) => {
								setMouseShortcut(ev, 'deafenShortcut');
							}}
						/>
					</Grid>
				</Grid>
				<Divider />
				<Typography variant="h6">Advanced</Typography>
				<FormControlLabel
					label="Show Lobby Code"
					checked={!settings.hideCode}
					onChange={(_, checked: boolean) => {
						setSettings({
							type: 'setOne',
							action: ['hideCode', !checked],
						});
					}}
					control={<Checkbox />}
				/>
				<FormControlLabel
					label="Enable Spatial Audio"
					checked={settings.enableSpatialAudio}
					onChange={(_, checked: boolean) => {
						setSettings({
							type: 'setOne',
							action: ['enableSpatialAudio', checked],
						});
					}}
					control={<Checkbox />}
				/>
				<URLInput
					initialURL={settings.serverURL}
					onValidURL={(url: string) => {
						setSettings({
							type: 'setOne',
							action: ['serverURL', url],
						});
					}}
					className={classes.urlDialog}
				/>
				<Alert
					className={classes.alert}
					severity="info"
					style={{ display: unsaved ? undefined : 'none' }}
				>
					Exit Settings to apply changes
				</Alert>
			</div>
		</Box>
	);
};

export default Settings;