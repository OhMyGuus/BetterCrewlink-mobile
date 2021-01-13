import { EventEmitter as EventEmitterO } from 'events';
import * as io from 'socket.io-client';
import { AmongUsState, GameState, Player } from './AmongUsState';
import { SocketElementMap, SocketElement, Client, AudioElement, IDeviceInfo } from './smallInterfaces';
import { connectionController } from './ConnectionController';
import { element } from 'protractor';

export default class AudioController extends EventEmitterO {
	audioDeviceId = 'default';
	stream: MediaStream;
	audioElementsCotainer: HTMLElement;

	constructor() {
		super();
		this.audioElementsCotainer = document.getElementById('AudioElements');
	}
	async startAudio() {
		if (this.stream) {
			return;
		}

		const audio: MediaTrackConstraintSet = {
			deviceId: this.audioDeviceId,
			autoGainControl: false,
			echoCancellation: true,
			latency: 0,
			noiseSuppression: true,
		};
		this.stream = await navigator.mediaDevices.getUserMedia({ video: false, audio });

		console.log('connected to microphone');
	}

	createAudioElement(stream: MediaStream): AudioElement {
		console.log('[createAudioElement]');
		const htmlAudioElement = document.createElement('audio');
		htmlAudioElement.setAttribute('playsinline', 'true');
		htmlAudioElement.setAttribute('controls', 'true');

		this.audioElementsCotainer.appendChild(htmlAudioElement);
		htmlAudioElement.srcObject = stream;

		const AudioContext = window.webkitAudioContext || window.AudioContext;
		const context = new AudioContext();

		const source = context.createMediaStreamSource(stream);
		const gain = context.createGain();
		const pan = context.createPanner();
		const compressor = context.createDynamicsCompressor();

		pan.refDistance = 0.1;
		pan.panningModel = 'equalpower';
		pan.distanceModel = 'linear';
		pan.maxDistance = connectionController.lobbySettings.maxDistance;
		pan.rolloffFactor = 1;
		gain.gain.value = 0;
		htmlAudioElement.volume = 1;

		const muffle = context.createBiquadFilter();
		muffle.type = 'lowpass';
		muffle.Q.value = 0;

		source.connect(pan);
		pan.connect(muffle);
		muffle.connect(gain);
		gain.connect(compressor);




		const audioContext = pan.context;
		const panPos = [3, 0];

		if (pan.positionZ) {
			pan.positionZ.setValueAtTime(-0.5, audioContext.currentTime);
			pan.positionX.setValueAtTime(panPos[0], audioContext.currentTime);
			pan.positionY.setValueAtTime(panPos[1], audioContext.currentTime);
		} else {
			pan.setPosition(panPos[0], panPos[1], -0.5);
		}
		compressor.connect(context.destination);

		return {
			htmlAudioElement,
			audioContext: context,
			mediaStreamAudioSource: source,
			gain,
			pan,
			compressor,
			muffle,
		} as AudioElement;
	}

	// move to different controller
	updateAudioLocation(currentGameState: AmongUsState, element: SocketElement, localPLayer: Player) {
		// console.log('updateAudioLocation ->', { element });
		if (!element.audioElement || !element.client || !element.player || !localPLayer) {
			if (element?.audioElement?.gain?.gain) {
				element.audioElement.gain.gain.value = 0;
			}
			return;
		}
		// console.log('[updateAudioLocation]');
		const pan = element.audioElement.pan;
		const gain = element.audioElement.gain;
		const muffle = element.audioElement.muffle;
		const audioContext = pan.context;

		const other = element.player; // this.getPlayer(element.client?.clientId);
		let panPos = [other.x - localPLayer.x, other.y - localPLayer.y];
		switch (currentGameState.gameState) {
			case GameState.MENU:
				gain.gain.value = 0;
				break;

			case GameState.LOBBY:
				gain.gain.value = 1;
				break;

			case GameState.TASKS:
				gain.gain.value = 1;

				if (!localPLayer.isDead && connectionController.lobbySettings.commsSabotage && currentGameState.comsSabotaged) {
					gain.gain.value = 0;
				}

				// Mute other players which are in a vent
				if (other.inVent && !connectionController.lobbySettings.hearImpostorsInVents) {
					gain.gain.value = 0;
				}

				if (
					!localPLayer.isDead &&
					other.isDead &&
					localPLayer.isImpostor &&
					connectionController.lobbySettings.haunting
				) {
					gain.gain.value = gain.gain.value * 0.02; //0.005;
				} else {
					if (!localPLayer.isDead && (other.isDead || currentGameState.comsSabotaged)) {
						gain.gain.value = 0;
					}
				}

				break;

			case GameState.DISCUSSION:
				panPos = [0, 0];
				gain.gain.value = 1;

				// Mute dead players for still living players
				if (!localPLayer.isDead && other.isDead) {
					gain.gain.value = 0;
				}
				break;

			case GameState.UNKNOWN:
			default:
				gain.gain.value = 0;
				break;
		}

		// Muffling in vents
		if (localPLayer.inVent || other.inVent) {
			muffle.frequency.value = 1200;
			muffle.Q.value = 20;
			if (gain.gain.value === 1) gain.gain.value = 0.7; // Too loud at 1
		} else {
			muffle.frequency.value = 20000;
			muffle.Q.value = 0;
		}

		if (pan.positionZ) {
			pan.positionZ.setValueAtTime(-0.5, audioContext.currentTime);
			pan.positionX.setValueAtTime(panPos[0], audioContext.currentTime);
			pan.positionY.setValueAtTime(panPos[1], audioContext.currentTime);
		} else {
			pan.setPosition(panPos[0], panPos[1], -0.5);
		}
	}

	disconnect() {
		this.stream.getTracks().forEach((track) => track.stop());
		this.stream = undefined;
	}

	disconnectElement(socketElement: SocketElement) {
		console.log('disconnectElement');

		if (!socketElement.audioElement) {
			console.log('disconnectElement -> !socketElement.audioElement -> ', socketElement);

			return;
		}
		console.log('disconnectElement -> !uff?');

		socketElement?.audioElement?.compressor?.disconnect();
		socketElement?.audioElement?.pan?.disconnect();
		socketElement?.audioElement?.gain?.disconnect();
		socketElement?.audioElement?.mediaStreamAudioSource?.disconnect();
		socketElement?.audioElement?.audioContext
			?.close()
			.then(() => {})
			.catch(() => {});

		console.log('socketElement?.audioElement?.htmlAudioElement');

		if (socketElement?.audioElement?.htmlAudioElement) {
			console.log('remove_element');
			socketElement?.audioElement?.htmlAudioElement.remove();
		}
		socketElement.peer?.destroy();
		socketElement.audioElement = undefined;
		socketElement.peer = undefined;
	}

	async getDevices(): Promise<IDeviceInfo[]> {
		let deviceId = 0;
		return (await navigator.mediaDevices.enumerateDevices())
			.filter((o) => o.kind === 'audiooutput' || o.kind === 'audioinput')
			.sort((a, b) => b.kind.localeCompare(a.kind))
			.map((o) => {
				const id = deviceId++;
				return {
					id,
					kind: o.kind,
					label: o.label || `mic ${o.kind.charAt(5)} ${id}`,
					deviceId: o.deviceId,
				};
			});
	}
}

export const audioController = new AudioController();
