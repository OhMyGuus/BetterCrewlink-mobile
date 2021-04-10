import React, {
	Dispatch,
	ErrorInfo,
	ReactChild,
	SetStateAction,
	useEffect,
	useReducer,
	useState,
} from 'react';
import ReactDOM from 'react-dom';
import { AmongUsState, Player } from '../common/AmongUsState';
import Settings, {
	settingsReducer,
	lobbySettingsReducer,
} from './settings/Settings';
import {
	GameStateContext,
	SettingsContext,
	LobbySettingsContext,
} from './contexts';
import { ThemeProvider } from '@material-ui/core/styles';
// import {
// 	AutoUpdaterState,
// 	IpcHandlerMessages,
// 	IpcRendererMessages,
// 	IpcSyncMessages,
// } from '../common/ipc-messages';
import theme from './theme';
import SettingsIcon from '@material-ui/icons/Settings';
import IconButton from '@material-ui/core/IconButton';
// import Dialog from '@material-ui/core/Dialog';
import makeStyles from '@material-ui/core/styles/makeStyles';
// import LinearProgress from '@material-ui/core/LinearProgress';
// import DialogTitle from '@material-ui/core/DialogTitle';
// import DialogContent from '@material-ui/core/DialogContent';
// import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
// import prettyBytes from 'pretty-bytes';
import './css/index.css';
import Typography from '@material-ui/core/Typography';
import SupportLink from './SupportLink';
import SelectColorMenu from './SelectColorMenu';
import EnterRoomCodeMenu from './EnterRoomCodeMenu';
import Cookies from 'universal-cookie';

// let appVersion = '';
// if (typeof window !== 'undefined' && window.location) {
// 	const query = new URLSearchParams(window.location.search.substring(1));
// 	appVersion = ' v' + query.get('version') || '';
// }

const keycodeMap = {
	Space: 57,
	Backspace: 14,
	Delete: 61011,
	Enter: 28,
	Up: 61000,
	Down: 61008,
	Left: 61003,
	Right: 61005,
	Home: 60999,
	End: 61007,
	PageUp: 61001,
	PageDown: 61009,
	Escape: 1,
	LControl: 29,
	LShift: 42,
	LAlt: 56,
	RControl: 3613,
	RShift: 54,
	RAlt: 3640,
	F1: 59,
	F2: 60,
	F3: 61,
	F4: 62,
	F5: 63,
	F6: 64,
	F7: 65,
	F8: 66,
	F9: 67,
	F10: 68,
	F11: 87,
	F12: 88,
};
type K = keyof typeof keycodeMap;

function keyCodeMatches(key: K, ev: React.KeyboardEvent): boolean {
	if (keycodeMap[key]) return keycodeMap[key] === ev.keyCode;
	else if (key && key.length === 1) return key.charCodeAt(0) === ev.keyCode;
	else {
		console.error('Invalid key', key);
		return false;
	}
}

const mouseClickMap = {
	MouseButton4: 4,
	MouseButton5: 5,
	MouseButton6: 6,
	MouseButton7: 7,
};

type M = keyof typeof mouseClickMap;

function mouseClickMatches(key: M, ev: React.MouseEvent): boolean {
	if (mouseClickMap[key]) return mouseClickMap[key] === ev.button;
	return false;
}

function isMouseButton(shortcutKey: string): boolean {
	return shortcutKey.includes('MouseButton');
}

const useStyles = makeStyles(() => ({
	root: {
		position: 'absolute',
		width: '100vw',
		height: theme.spacing(3),
		backgroundColor: '#1d1a23',
		top: 0,
		WebkitAppRegion: 'drag',
	},
	title: {
		width: '100%',
		textAlign: 'center',
		display: 'block',
		height: theme.spacing(3),
		lineHeight: `${theme.spacing(3)}px`,
		color: theme.palette.primary.main,
	},
	button: {
		WebkitAppRegion: 'no-drag',
		marginLeft: 'auto',
		padding: 0,
		position: 'absolute',
		top: 0,
	},
}));

interface TitleBarProps {
	settingsOpen: boolean;
	setSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

const TitleBar: React.FC<TitleBarProps> = function ({
	settingsOpen,
	setSettingsOpen,
}: TitleBarProps) {
	const classes = useStyles();
	return (
		<div className={classes.root}>
			<span className={classes.title}>ImpostieTalkie</span>
			<IconButton
				className={classes.button}
				style={{ left: 0 }}
				size="small"
				onClick={() => setSettingsOpen(!settingsOpen)}
			>
				<SettingsIcon htmlColor="#777" />
			</IconButton>
		</div>
	);
};

interface ErrorBoundaryProps {
	children: ReactChild;
}
interface ErrorBoundaryState {
	error?: Error;
}

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// Update state so the next render will show the fallback UI.
		return { error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('React Error: ', error, errorInfo);
	}

	render(): ReactChild {
		if (this.state.error) {
			return (
				<div style={{ paddingTop: 16 }}>
					<Typography align="center" variant="h6" color="error">
						REACT ERROR
					</Typography>
					<Typography
						align="center"
						style={{
							whiteSpace: 'pre-wrap',
							fontSize: 12,
							maxHeight: 200,
							overflowY: 'auto',
						}}
					>
						{this.state.error.stack}
					</Typography>
					<SupportLink />
					<Button
						style={{ margin: '10px auto', display: 'block' }}
						variant="contained"
						color="secondary"
						onClick={() => window.location.reload()}
					>
						Reload App
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}

const App: React.FC = function () {
	const [gameState, setGameState] = useState<AmongUsState>({} as AmongUsState);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [error, ] = useState('');
	const [roomCode, setRoomCode] = useState<string>('');
	const [player, setPlayer] = useState<Player | undefined>(undefined);
	const [isPushToTalkKeyDown, setIsPushToTalkKeyDown] = useState(false);
	const [isMuted, setIsMuted] = useState(false);
	const [isDeafened, setIsDeafened] = useState(false);

	const toggleIsDeafened = () => setIsDeafened(!isDeafened);
	const toggleIsMuted = () => setIsMuted(!isMuted);

	const getCookieSettingWithDefault = (name: string, defaultVal: unknown) => {
		const cookies = new Cookies();
		return cookies.get(name) ?? defaultVal;
	}

	useEffect(() => {
		setPlayer(getCookieSettingWithDefault('selectedPlayer', undefined));
		setRoomCode(getCookieSettingWithDefault('selectedRoomCode', undefined));
	}, []);
	
	const settings = useReducer(settingsReducer, {
		alwaysOnTop: getCookieSettingWithDefault('alwaysOnTop', false),
		microphone: getCookieSettingWithDefault('microphone', 'Default'),
		speaker: getCookieSettingWithDefault('speaker', 'Default'),
		pushToTalk: getCookieSettingWithDefault('pushToTalk', false),
		serverURL: getCookieSettingWithDefault('serverURL', 'https://impostietalkie.herokuapp.com/'),
		pushToTalkShortcut: getCookieSettingWithDefault('pushToTalkShortcut', 'V'),
		deafenShortcut: getCookieSettingWithDefault('deafenShortcut', 'RControl'),
		muteShortcut: getCookieSettingWithDefault('muteShortcut', 'RAlt'),
		hideCode: getCookieSettingWithDefault('hideCode', false),
		enableSpatialAudio: getCookieSettingWithDefault('enableSpatialAudio', true),
		localLobbySettings: getCookieSettingWithDefault('localLobbySettings', {
			maxDistance: 5.32,
			haunting: false,
			hearImpostorsInVents: false,
			commsSabotage: true,
		}),
	});
	const lobbySettings = useReducer(
		lobbySettingsReducer,
		settings[0].localLobbySettings
	);

	const onKeyDown = (ev: React.KeyboardEvent) => {
		const shortcutKey = settings[0].pushToTalkShortcut;
		if (!isMouseButton(shortcutKey) && keyCodeMatches(shortcutKey as K, ev)) {
			try {
				setIsPushToTalkKeyDown(true);
			} catch (_) {}
		}
	}

	const onKeyUp = (ev: React.KeyboardEvent) => {
		const shortcutKey = settings[0].pushToTalkShortcut;
		if (!isMouseButton(shortcutKey) && keyCodeMatches(shortcutKey as K, ev)) {
			try {
				setIsPushToTalkKeyDown(false);
			} catch (_) {}
		}
		const deafenShortcut = settings[0].deafenShortcut;
		if (
			!isMouseButton(deafenShortcut) &&
			keyCodeMatches(deafenShortcut as K, ev)
		) {
			try {
				toggleIsDeafened();
			} catch (_) {}
		}
		const muteShortcut = settings[0].muteShortcut;
		if (keyCodeMatches(muteShortcut as K, ev)) {
			try {
				toggleIsMuted();
			} catch (_) {}
		}
	}

	const onMouseDown = (ev: React.MouseEvent) => {
		const shortcutMouse = settings[0].pushToTalkShortcut;
		if (
			isMouseButton(shortcutMouse) &&
			mouseClickMatches(shortcutMouse as M, ev)
		) {
			try {
				setIsPushToTalkKeyDown(true);
			} catch (_) {}
		}
	}

	const onMouseUp = (ev: React.MouseEvent) => {
		const shortcutMouse = settings[0].pushToTalkShortcut;
		if (
			isMouseButton(shortcutMouse) &&
			mouseClickMatches(shortcutMouse as M, ev)
		) {
			try {
				setIsPushToTalkKeyDown(false);
			} catch (_) {}
		}
		const deafenShortcut = settings[0].deafenShortcut;
		if (
			isMouseButton(deafenShortcut) &&
			mouseClickMatches(deafenShortcut as M, ev)
		) {
			try {
				toggleIsDeafened();
			} catch (_) {}
		}
		const muteShortcut = settings[0].muteShortcut;
		if (
			isMouseButton(muteShortcut) &&
			mouseClickMatches(muteShortcut as M, ev)
		) {
			try {
				toggleIsMuted();
			} catch (_) {}
		}
	}

	let page;
	if (player) {
		page = (
			<Voice error={error} player={player} isPushToTalkKeyDown={isPushToTalkKeyDown} isDeafened={isDeafened} isMuted={isMuted} setGameState={setGameState} roomCode={roomCode}/>
		);
	} else if (roomCode) {
		page = <SelectColorMenu setPlayer={setPlayer} roomCode={roomCode}/>;
	} else {
		page = <EnterRoomCodeMenu setRoomCode={setRoomCode}/>;
	}

	return (
		<GameStateContext.Provider value={gameState}>
			<LobbySettingsContext.Provider value={lobbySettings}>
				<SettingsContext.Provider value={settings}>
					<ThemeProvider theme={theme}>
						<div
							onKeyDown={onKeyDown}
							onKeyUp={onKeyUp}
							onMouseDown={onMouseDown}
							onMouseUp={onMouseUp}
						>
							<TitleBar
								settingsOpen={settingsOpen}
								setSettingsOpen={setSettingsOpen}
							/>
							<ErrorBoundary>
								<>
									<Settings
										open={settingsOpen}
										onClose={() => setSettingsOpen(false)}
									/>
									{page}
								</>
							</ErrorBoundary>
						</div>
					</ThemeProvider>
				</SettingsContext.Provider>
			</LobbySettingsContext.Provider>
		</GameStateContext.Provider>
	);
};

ReactDOM.render(<App />, document.getElementById('root'));