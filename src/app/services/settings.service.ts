import { Injectable, OnInit } from '@angular/core';
import { VoiceServerOption, ISettings, PlayerSettingsMap, PlayerSetting } from './smallInterfaces';
import { Platform } from '@ionic/angular';
import { Storage } from '@ionic/storage';

const DEFAULTSETTINGS: ISettings = {
	gamecode: '',
	voiceServerOption: VoiceServerOption.BETTERCREWLINK,
	customVoiceServer: 'https://bettercrewl.ink',
	username: '',
	selectedMicrophone: { id: 0, label: 'default', deviceId: 'default', kind: 'audioinput' },
	natFix: false,
	playerSettings: new PlayerSettingsMap(),
	overlayEnabled: false,
	isMobile: false
};

const DEFAULTPLAYERSETTING: PlayerSetting = {
	volume: 100,
};

@Injectable({
	providedIn: 'root',
})
export class SettingsService {
	private settings: ISettings | undefined = DEFAULTSETTINGS;
	IsMobile: boolean;

	constructor(private storage: Storage, private platform: Platform) {
		this.IsMobile = this.platform.is('cordova') || this.platform.is('capacitor');
		this.load();
	}

	get() {
		if (this.settings.isMobile !== this.IsMobile) {
			this.settings.isMobile = this.IsMobile;
		}
		return this.settings;
	}

	getPlayerSettings(nameHash: number): PlayerSetting {
		if (!this.settings.playerSettings.has(nameHash)) {
			return { ...DEFAULTPLAYERSETTING };
		}
		return this.settings.playerSettings.get(nameHash);
	}

	savePlayerSetting(nameHash: number, playerSetting: PlayerSetting) {
		this.settings.playerSettings.set(nameHash, playerSetting);
		this.save();
	}

	getVoiceServer() {
		switch (this.settings.voiceServerOption) {
			case VoiceServerOption.ORIGINALCREWLINK:
			case VoiceServerOption.BETTERCREWLINK:
				return 'https://bettercrewl.ink';
			case VoiceServerOption.CUSTOM:
				return !this.IsMobile && this.settings.customVoiceServer.includes('//crewl.ink')
					? 'https://ubuntu1.guus.info'
					: this.settings.customVoiceServer;
		}
	}

	save() {
		this.storage.set('settings', this.settings);
	}

	private async load() {
		const loadedSettings = await this.storage.get('settings');
		console.log('loaded settings: ', loadedSettings);
		if (loadedSettings && loadedSettings !== null) {
			for (const key of Object.keys(this.settings)) {
				if (key in loadedSettings) {
					this.settings[key] = loadedSettings[key];
				}
			}
		}
	}
}
