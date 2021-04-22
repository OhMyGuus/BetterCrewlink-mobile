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
import Settings, {
	settingsReducer,
	lobbySettingsReducer
} from './Settings';
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
	IonHeader,
	IonButton,
	IonText
} from '@ionic/react';
import {
	SettingsSharp
} from 'react-ionicons';
import Cookies from 'universal-cookie';
import { DEFAULT_LOBBYSETTINGS } from './services/smallInterfaces';


interface TitleBarProps {
	settingsOpen: boolean;
	setSettingsOpen: Dispatch<SetStateAction<boolean>>;
}

const TitleBar: React.FC<TitleBarProps> = function ({
	settingsOpen,
	setSettingsOpen,
}: TitleBarProps) {
	return (
		<IonHeader className='root'>
			<span className='title'>ImpostieTalkie</span>
			<IonButton
				style={{ left: 0 }}
				className = 'button'
				size="small"
				onClick={() => setSettingsOpen(!settingsOpen)}
			>
				<SettingsSharp color="#777" />
			</IonButton>
		</IonHeader>
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
		voiceServerOption: getCookieSettingWithDefault('voiceServerOption', 1),
		customVoiceServer: getCookieSettingWithDefault('customVoiceServer', 'https://bettercrewl.ink'),
		username: getCookieSettingWithDefault('username', 'Coochie Man'),
		gamecode: getCookieSettingWithDefault('gamecode', 'ABCDEF'),
		selectedMicrophone: getCookieSettingWithDefault('selectedMicrophone', {
			kind: '',
			label: 'Mic 0',
			deviceId: '',
			id: 0,
		}),
		natFix: getCookieSettingWithDefault('natFix', false),
		playerSettings: getCookieSettingWithDefault('playerSettings', {
			volume: 1
		}),
		overlayEnabled: getCookieSettingWithDefault('overlayEnabled', false),
		isMobile: getCookieSettingWithDefault('isMobile', true)
	});

	const lobbySettings = useReducer(
		lobbySettingsReducer,
		DEFAULT_LOBBYSETTINGS
	);

	return (
		<IonApp>
			<GameStateContext.Provider value={gameState}>
				<SettingsContext.Provider value={settings}>
					<LobbySettingsContext.Provider value={lobbySettings}>
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
								</>
							</ErrorBoundary>
						</div>
					</LobbySettingsContext.Provider>
				</SettingsContext.Provider>
			</GameStateContext.Provider>
		</IonApp>
	);
};

export default App