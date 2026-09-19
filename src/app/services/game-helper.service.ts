import { Injectable } from '@angular/core';
import { IDeviceInfo } from './smallInterfaces';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';import { Platform } from '@ionic/angular';
import { ConnectingStage, ConnectionController, ConnectionState } from './ConnectionController.service';
import { AmongUsState } from '../common/AmongUsState';
import { VoiceController } from './voice-controller.service';
import { EventEmitter as EventEmitterO } from 'events';
import { BackgroundMode } from '@awesome-cordova-plugins/background-mode/ngx';
import { SettingsService } from './settings.service';
import { BetterCrewlinkNativeService } from 'bcl-mobile-overlay';

interface NativeBridgeEvent extends Event {
	action: string;
}

const GAME_STATE_NAMES = ['LOBBY', 'TASKS', 'DISCUSSION', 'MENU', 'UNKNOWN'];

/**
 * Human-readable status line for the connecting screen. Pure (and therefore unit-testable)
 * because the view calls it on every change-detection pass while connecting.
 *
 * `oldGameState` is undefined until the second game-state frame arrives, so reading
 * `oldGameState.gameState` unguarded threw a TypeError here. Because the render is triggered
 * synchronously from inside VoiceController's `hostUpdate` handler, that view-layer throw
 * unwound into its catch and marked the whole connection as errored - a missing guard in a
 * status string took down a working connection.
 */
export function connectionStageLabel(
	stage: ConnectingStage,
	ctx: { gamecode?: string; amongusUsername?: string; oldGameState?: AmongUsState }
): string {
	switch (stage) {
		case ConnectingStage.connectingToVoiceServer:
			return 'Connecting to voice server..';
		case ConnectingStage.startingMicrophone:
			return 'Initializing audio/microphone';
		case ConnectingStage.searchingForHost:
			return `Searching for bettercrewlink PC players in lobby: ${ctx.gamecode}`;
		case ConnectingStage.waitingForHostToEnable:
			return 'Waiting for a PC player to respond';
		case ConnectingStage.WaitingForGameData:
			return 'Waiting to recieve gamedata from player';
		case ConnectingStage.waitingForYouToJoin: {
			const previousState = ctx.oldGameState ? GAME_STATE_NAMES[ctx.oldGameState.gameState] : undefined;
			return `Waiting for you to join with the name ${ctx.amongusUsername} --> ${previousState ?? 'UNKNOWN'}`;
		}
		case ConnectingStage.parsingGameData:
			return 'Waiting for gamedata...';
		case ConnectingStage.FullyConnected:
			return 'Connected to the game...';
		default:
			return `unkown state ${stage}`;
	}
}

@Injectable({
	providedIn: 'root',
})
export class GameHelperService {
	microphones: IDeviceInfo[] = [];
	speakers: IDeviceInfo[] = [];
	IsMobile = false;
	error: string;
	events: EventEmitterO = new EventEmitterO();
	audioMuted = () => this.cManager.audioController.audioMuted ?? false;
	microphoneMuted = () =>
		(this.cManager.audioController.microphoneMuted || this.cManager.audioController.audioMuted) ?? false;
	localTalking = () => this.cManager?.audioController?.localTalking ?? false;
	constructor(
		private androidPermissions: AndroidPermissions,
		public platform: Platform,
		public cManager: ConnectionController,
		public voiceController: VoiceController,
		private backgroundMode: BackgroundMode,
		private settings: SettingsService
	) {
		this.IsMobile = true;//this.platform.is('cordova') || this.platform.is('android') || this.platform.is('mobile');
		this.load();
	}

	reconnect() {
		this.cManager.disconnect(false);
		this.cManager.connect(
			this.settings.getVoiceServer(),
			this.settings.get().gamecode.toUpperCase(),
			this.settings.get().username,
			this.settings.get().selectedMicrophone.deviceId,
			this.settings.get().natFix
		);
		setTimeout(() => {
			this.updateViews();
		}, 1500);
	}

	connect() {
		this.disconnect(false);
		this.error = undefined;

		this.requestPermissions().then(async (haspermissions) => {
			if (!haspermissions) {
				console.error('permissions failed');
				this.cManager.connectionState = ConnectionState.error;
				this.error = 'No permissions to use microphone.';
				return;
			}
			// Android 14+ requires the mic to be actively capturing before a
			// "microphone" type foreground service can be started, otherwise
			// backgroundMode.enable() crashes with a SecurityException.
			this.cManager.deviceID = this.settings.get().selectedMicrophone.deviceId;
			await this.cManager.audioController.startAudio();
			this.backgroundMode.enable();
			this.cManager.connect(
				this.settings.getVoiceServer(),
				this.settings.get().gamecode.toUpperCase(),
				this.settings.get().username,
				this.settings.get().selectedMicrophone.deviceId,
				this.settings.get().natFix
			);
			this.showNotification();
		});
		setTimeout(() => {
			this.updateViews();
		}, 1500);
	}

	disconnect(disableBackgroundMode = true) {
		if (disableBackgroundMode) {
			this.backgroundMode.disable();
			if (this.IsMobile) {
				BetterCrewlinkNativeService.disconnect();
			}
		}
		this.cManager.disconnect(true);
		this.voiceController.reset();
	}

	muteMicrophone() {
		this.cManager.audioController.changeMuteState(!this.cManager.audioController.microphoneMuted, false);
		this.showNotification();
	}

	muteAudio() {
		this.cManager.audioController.changeMuteState(
			this.cManager.audioController.microphoneMuted,
			!this.cManager.audioController.audioMuted
		);
		this.showNotification();
	}

	async showNotification() {
		if (!this.IsMobile) return;
		console.log('showNotification BCL PLUGIN');
		await BetterCrewlinkNativeService.showNotification({
			audiomuted: this.audioMuted(),
			micmuted: this.microphoneMuted(),
			overlayEnabled: this.settings.get().overlayEnabled,
		});
	}

	getError(): string {
		// ConnectionController.error carries game-state/orchestration failures (e.g. from
		// VoiceController's onGameState); this.error carries permission/microphone failures set
		// directly here. Both land on the same error screen, so both must be readable from it.
		return this.cManager.error ?? this.error;
	}

	async requestPermissions(): Promise<boolean> {
		if (this.platform.is('cordova') || this.platform.is('android')) {
			const PERMISSIONS_NEEDED = [
				'android.permission.BLUETOOTH',
				// this.androidPermissions.PERMISSION.RECORD_AUDIO,
				// this.androidPermissions.PERMISSION.INTERNET,
			];

			try {
				await this.androidPermissions.requestPermissions(PERMISSIONS_NEEDED);
				for (const permission of PERMISSIONS_NEEDED) {
					const permissionResponse = await this.androidPermissions.checkPermission(permission);
					if (!permissionResponse.hasPermission) {
						return true;
					}
				}
			} catch {
				//	this.error = 'Bluetooth audio permission denied';
				return true;
			}
		}

		try {
			await this.cManager.audioController.requestPermissions();
		} catch {
			this.error = 'No permission to use microphone';
			return false;
		}
		return true;
	}

	getConnectionStage(): string {
		return connectionStageLabel(this.cManager.connectingStage, this.cManager);
	}

	updateViews() {
		this.events.emit('onChange');
	}

	load() {
		console.log('load??');

		this.cManager.events.on('onChange', () => {
			this.updateViews();
		});

		// Stored settings (including the previously selected microphone) must be in place before
		// devices are enumerated and a default is picked - otherwise the fresh device list's
		// positional id would be matched against (and overwrite) the persisted selection, or the
		// hardcoded default would win before the stored value ever arrived.
		void this.settings.load().then(() => {
			this.cManager.audioController.getDevices().then((devices) => {
				this.microphones = devices.filter((o) => o.kind === 'audioinput');
				this.speakers = devices.filter((o) => o.kind === 'audiooutput');
				const storedMicrophone = this.settings.get().selectedMicrophone;
				if (!this.microphones.some((o) => o.id === storedMicrophone?.id)) {
					this.settings.get().selectedMicrophone = this.microphones[0] ?? {
						id: 0,
						label: 'default',
						deviceId: 'default',
						kind: 'audioinput',
					};
				} else {
					this.settings.get().selectedMicrophone = this.microphones.find(
						(o) => o.id === storedMicrophone.id
					);
				}
				this.updateViews();
			});
		});

		// this.connect();

		window.addEventListener('bettercrewlink_notification', (info: NativeBridgeEvent) => {
			console.log('[EVENT] bettercrewlink_notification: ', JSON.stringify(info));
			switch (info.action) {
				case 'REFRESH': {
					this.reconnect();
					break; 
				}
				case 'MUTEAUDIO': {
					this.muteAudio();
					break;
				}
				case 'MUTEMICROPHONE': {
					this.muteMicrophone();
					break;
				}
				case 'DISCONNECT': {
					this.disconnect(true);
					break;
				}
				default: {
					console.log('unkown notification action: ', info);
					break;
				}
			}
			console.log('Notification action done');
		});
		this.cManager.events.on('player_talk', async (clientId: number, talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					const player = this.cManager.getPlayer(clientId);
					if (player && this.voiceController.isTalking(clientId) === talking) {
						BetterCrewlinkNativeService.showTalking({
							color: player.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		this.cManager.audioController.events.on('local_talk', async (talking: boolean) => {
			if (!this.IsMobile) {
				return;
			}
			setTimeout(
				() => {
					if (talking === this.localTalking() && this.cManager.localPLayer) {
						BetterCrewlinkNativeService.showTalking({
							color: this.cManager.localPLayer.colorId,
							talking,
						});
					}
				},
				talking ? 0 : 2000
			);
		});

		window.addEventListener('press_overlay', (info: NativeBridgeEvent) => {
			console.log('[EVENT] press_overlay: ', JSON.stringify(info));
			if (info.action === 'MICROPHONE') {
				this.muteMicrophone();
			} else if (info.action === 'AUDIO') {
				this.muteAudio();
			} else if (info.action === 'REFRESH') {
				this.reconnect();
			}
		});
		// LocalNotifications.on('yes').subscribe((notification) => {
		// 	this.connect();
		// 	this.showNotification();
		// });

		// LocalNotifications.on('click').subscribe((notification) => {
		// 	this.connect();
		// 	this.showNotification();
		// });
	}
}
