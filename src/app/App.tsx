import React, {
	Dispatch,
	SetStateAction,
	ErrorInfo,
	ReactChild,
	useEffect,
	useState,
	useReducer
} from 'react';
import './App.css';
import Settings from './Settings';
import {
	AmongUsState,
	Player
} from './services/AmongUsState'
import {
	GameStateContext,
	SettingsContext,
	LobbySettingsContext
} from './contexts';
import {
	IonApp,
	IonPage,
	IonContent,
	IonButton,
	IonText
} from '@ionic/react';
import {
	SettingsSharp
} from 'react-ionicons';
import Cookies from 'universal-cookie';


interface TitleBarProps {
	settingsOpen: boolean;
	setSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

const TitleBar: React.FC<TitleBarProps> = function ({
	settingsOpen,
	setSettingsOpen,
}: TitleBarProps) {
	return (
		<IonContent className='root'>
			<span className='title'>ImpostieTalkie</span>
			<IonButton
				style={{ left: 0 }}
				className = 'button'
				size="small"
				onClick={() => setSettingsOpen(!settingsOpen)}
			>
				<SettingsSharp color="#777" />
			</IonButton>
		</IonContent>
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
					<IonText color="error">
						REACT ERROR
					</IonText>
					<IonText
						style={{
							whiteSpace: 'pre-wrap',
							fontSize: 12,
							maxHeight: 200,
							overflowY: 'auto',
						}}
					>
						{this.state.error.stack}
					</IonText>
					<IonButton
						style={{ margin: '10px auto', display: 'block' }}
						color="secondary"
						onClick={() => window.location.reload()}
					>
						Reload App
					</IonButton>
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


	return (
		<GameStateContext.Provider value={gameState}>
			<LobbySettingsContext.Provider value={settings}>
				<SettingsContext.Provider value={settings}>
						<div>
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
				</SettingsContext.Provider>
			</LobbySettingsContext.Provider>
		</GameStateContext.Provider>
	);
};