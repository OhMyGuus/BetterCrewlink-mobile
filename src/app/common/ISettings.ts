import type { IDeviceInfo, PlayerSettingsMap, VoiceServerOption } from '../services/smallInterfaces';

// --- verbatim from bettercrewlink (desktop) v3.2.1 src/common/ISettings.d.ts ---
// Keep this block textually identical to desktop's `ILobbySettings`; see
// scripts/check-schema-drift.mjs, which fails the build if desktop adds, removes
// or renames a field here without a matching mobile update.
export interface ILobbySettings {
	maxDistance: number;
	visionHearing: boolean;
	haunting: boolean;
	hearImpostorsInVents: boolean;
	impostersHearImpostersInvent: boolean;
	impostorRadioEnabled: boolean;
	impostorRadioPrivate: boolean;
	commsSabotage: boolean;
	deadOnly: boolean;
	meetingGhostOnly: boolean;
	hearThroughCameras: boolean;
	wallsBlockAudio: boolean;
	publicLobby_on: boolean;
	publicLobby_title: string;
	publicLobby_language: string;
}
// --- end verbatim block ---

/**
 * Mobile's own persisted-settings shape. Desktop's `ISettings.d.ts` covers
 * Electron-only concerns (alwaysOnTop, hardware_acceleration, shortcuts, ...) that
 * don't apply here, so this is not a port of that interface - just the fields mobile
 * actually needs, including the audio-mix fields `spatialAudio.ts` reads on `settings`
 * (ghostVolumeAsImpostor, crewVolumeAsGhost, masterVolume, enableSpatialAudio).
 */
export interface ISettings {
	voiceServerOption: VoiceServerOption;
	customVoiceServer: string;
	username: string;
	gamecode: string;
	selectedMicrophone: IDeviceInfo;
	/** Output device (speaker); undefined/'default' when the platform can't enumerate outputs. */
	selectedSpeaker: IDeviceInfo | undefined;
	natFix: boolean;
	playerSettings: PlayerSettingsMap;
	overlayEnabled: boolean;
	isMobile: boolean;

	ghostVolumeAsImpostor: number;
	crewVolumeAsGhost: number;
	masterVolume: number;
	enableSpatialAudio: boolean;

	echoCancellation: boolean;
	noiseSuppression: boolean;
	autoGainControl: boolean;
	microphoneGain: number;
	microphoneGainEnabled: boolean;
	micSensitivity: number;
	micSensitivityEnabled: boolean;
}
