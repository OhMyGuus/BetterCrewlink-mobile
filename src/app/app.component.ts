import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { SettingsService } from './services/settings.service';
import { environment } from '../environments/environment';
@Component({
	selector: 'app-root',
	templateUrl: 'app.component.html',
	styleUrls: ['app.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush,
	standalone: false,
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
	readonly appVersion = environment.appVersion;
	public selectedIndex = 0;
	public appPages = [
		{
			title: 'game',
			url: '/game',
			icon: 'home',
		},
		{
			title: 'lobby settings',
			url: '/lobby-settings',
			icon: 'options',
		},
		{
			title: 'audio settings',
			url: '/audio-settings',
			icon: 'volume-high',
		},
		{
			title: 'settings',
			url: '/settings',
			icon: 'settings',
		},
	];

	@ViewChild('appHeaderEl', { read: ElementRef }) private appHeaderEl: ElementRef<HTMLElement>;
	private headerResizeObserver: ResizeObserver;

	constructor(private settingsService: SettingsService) {}

	async ngOnInit() {
		console.log('AppComponent initialized');
		await this.settingsService.load();
	}

	ngAfterViewInit() {
		// The header's real rendered height (including any safe-area padding Ionic
		// adds for edge-to-edge status bars) can't be reliably hardcoded - it varies
		// by device, OS insets, and font scale. Measure it directly instead so
		// #main-content .ion-page's offset (see global.scss) always matches reality.
		const headerElement = this.appHeaderEl?.nativeElement;
		if (!headerElement) {
			return;
		}
		const updateHeaderHeight = () => {
			document.documentElement.style.setProperty('--app-header-height', `${headerElement.offsetHeight}px`);
		};
		updateHeaderHeight();
		this.headerResizeObserver = new ResizeObserver(updateHeaderHeight);
		this.headerResizeObserver.observe(headerElement);
	}

	ngOnDestroy() {
		this.headerResizeObserver?.disconnect();
	}
}
