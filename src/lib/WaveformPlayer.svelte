<!--
  WaveformPlayer.svelte
  ---------------------

  Svelte 5 wrapper around `@arraypress/waveform-player`. Mounts a player
  instance into a `<div>` on mount, tears it down on unmount, and
  re-mounts when any construction prop changes.

  Like the React / Vue counterparts, non-identity prop changes also
  re-create the instance, which is simpler than diffing every option and
  calling the right granular updater. The library re-uses waveform peaks
  cached by URL, so same-URL re-mounts are cheap.

  Library setup — import the core CSS ONCE in your app entry; this
  component does NOT import it for you:

      import '@arraypress/waveform-player/dist/waveform-player.css';

  The library's JS is imported dynamically inside a `$effect` (which
  only runs in the browser), so SSR never evaluates the audio surface.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { WaveformPlayer as WaveformPlayerInstance } from '@arraypress/waveform-player';
	import type { WaveformPlayerCallbacks, WaveformPlayerProps } from './types.js';

	/** Minimal structural view of the methods the wrapper calls. */
	type PlayerInstance = {
		destroy?: () => void;
		play?: () => Promise<void> | undefined;
		pause?: () => void;
		togglePlay?: () => void;
		seekTo?: (s: number) => void;
		seekToPercent?: (p: number) => void;
		setVolume?: (v: number) => void;
		setPlaybackRate?: (r: number) => void;
		setPlayingState?: (p: boolean) => void;
		setProgress?: (c: number, d: number) => void;
		loadTrack?: (u: string, t?: string, s?: string, o?: Record<string, unknown>) => Promise<void>;
	};
	type PlayerCtor = new (el: HTMLElement, opts: Record<string, unknown>) => PlayerInstance;

	type Props = WaveformPlayerProps & WaveformPlayerCallbacks & HTMLAttributes<HTMLDivElement>;

	let {
		// ── Audio source ───────────────────────────────────────────────
		url,
		src,
		audioMode,
		preload,
		// ── Waveform visualisation ─────────────────────────────────────
		waveformStyle,
		height,
		samples,
		barWidth,
		barSpacing,
		barRadius,
		waveform,
		// ── Colours ────────────────────────────────────────────────────
		colorPreset,
		waveformColor,
		progressColor,
		// ── Playback controls ──────────────────────────────────────────
		playbackRate,
		showPlaybackSpeed,
		playbackRates,
		// ── UI toggles ─────────────────────────────────────────────────
		showControls,
		showInfo,
		showTime,
		showHoverTime,
		showBPM,
		bpm,
		buttonAlign,
		layout,
		buttonStyle,
		buttonSize,
		buttonRadius,
		// ── Accessibility ──────────────────────────────────────────────
		accessibleSeek,
		seekLabel,
		seekValueText,
		playPauseLabel,
		speedLabel,
		// ── Error UI ───────────────────────────────────────────────────
		errorText,
		unknownTrackText,
		// ── Markers ────────────────────────────────────────────────────
		markers,
		showMarkers,
		// ── Content metadata ───────────────────────────────────────────
		title,
		artist,
		artwork,
		artworkAlt,
		artworkPosition,
		album,
		// ── Behaviour ──────────────────────────────────────────────────
		autoplay,
		singlePlay,
		playOnSeek,
		enableMediaSession,
		// ── Icons ──────────────────────────────────────────────────────
		playIcon,
		pauseIcon,
		// ── Lifecycle callbacks ────────────────────────────────────────
		onload,
		onplay,
		onpause,
		onend,
		ontimeupdate,
		onerror,
		// ── Host element ───────────────────────────────────────────────
		class: className = '',
		...rest
	}: Props = $props();

	let container: HTMLDivElement;
	let instance: PlayerInstance | null = null;
	/* Monotonic token: every (re)mount bumps it; an in-flight async
	 * import whose token is stale bails instead of attaching a zombie. */
	let token = 0;

	/** Map the current props into the core library's option shape. */
	function buildOptions(): Record<string, unknown> {
		const opts: Record<string, unknown> = {};
		const set = (key: string, value: unknown) => {
			if (value !== undefined && value !== null) opts[key] = value;
		};

		if (url !== undefined) opts.url = url;
		else if (src !== undefined) opts.url = src;
		set('audioMode', audioMode);
		set('preload', preload);

		set('waveformStyle', waveformStyle);
		set('height', height);
		set('samples', samples);
		set('barWidth', barWidth);
		set('barSpacing', barSpacing);
		set('barRadius', barRadius);
		set('waveform', waveform);

		set('colorPreset', colorPreset);
		set('waveformColor', waveformColor);
		set('progressColor', progressColor);

		set('playbackRate', playbackRate);
		set('showPlaybackSpeed', showPlaybackSpeed);
		set('playbackRates', playbackRates);

		set('showControls', showControls);
		set('showInfo', showInfo);
		set('showTime', showTime);
		set('showHoverTime', showHoverTime);
		set('showBPM', showBPM);
		set('bpm', bpm);
		set('buttonAlign', buttonAlign);
		set('layout', layout);
		set('buttonStyle', buttonStyle);
		set('buttonSize', buttonSize);
		set('buttonRadius', buttonRadius);

		set('accessibleSeek', accessibleSeek);
		set('seekLabel', seekLabel);
		set('seekValueText', seekValueText);
		set('playPauseLabel', playPauseLabel);
		set('speedLabel', speedLabel);

		set('errorText', errorText);
		set('unknownTrackText', unknownTrackText);

		set('markers', markers);
		set('showMarkers', showMarkers);

		set('title', title);
		set('artist', artist);
		set('artwork', artwork);
		set('artworkAlt', artworkAlt);
		set('artworkPosition', artworkPosition);
		set('album', album);

		set('autoplay', autoplay);
		set('singlePlay', singlePlay);
		set('playOnSeek', playOnSeek);
		set('enableMediaSession', enableMediaSession);

		set('playIcon', playIcon);
		set('pauseIcon', pauseIcon);

		return opts;
	}

	function teardown() {
		if (instance && typeof instance.destroy === 'function') {
			try {
				instance.destroy();
			} catch (err) {
				console.warn('[WaveformPlayerSvelte] destroy() threw:', err);
			}
		}
		instance = null;
	}

	function mount(opts: Record<string, unknown>) {
		const my = ++token;
		if (!container) return;

		import('@arraypress/waveform-player')
			.then((mod) => {
				if (my !== token || !container) return;

				const Ctor = (mod.default ??
					(mod as { WaveformPlayer?: unknown }).WaveformPlayer) as PlayerCtor;
				if (typeof Ctor !== 'function') {
					console.error('[WaveformPlayerSvelte] Failed to resolve WaveformPlayer constructor from module.');
					return;
				}

				/* Wire callbacks. The lowercase props are reactive, so the
				 * closures always reach the latest handler without a remount. */
				opts.onLoad = (i: WaveformPlayerInstance) => onload?.(i);
				opts.onPlay = (i: WaveformPlayerInstance) => onplay?.(i);
				opts.onPause = (i: WaveformPlayerInstance) => onpause?.(i);
				opts.onEnd = (i: WaveformPlayerInstance) => onend?.(i);
				opts.onTimeUpdate = (c: number, d: number, i: WaveformPlayerInstance) => ontimeupdate?.(c, d, i);
				opts.onError = (e: Error, i: WaveformPlayerInstance) => onerror?.(e, i);

				instance = new Ctor(container, opts);
			})
			.catch((err) => {
				console.error('[WaveformPlayerSvelte] Failed to load library:', err);
			});
	}

	/* Mount / re-mount lifecycle. `buildOptions()` synchronously reads
	 * every construction prop, so the effect re-runs (and re-mounts) when
	 * any of them change. Runs only in the browser — SSR renders the bare
	 * `<div>`. */
	$effect(() => {
		const opts = buildOptions();
		teardown();
		mount(opts);
		return () => {
			token += 1;
			teardown();
		};
	});

	/* Imperative API — reachable via `bind:this`. Thin pass-throughs;
	 * calls before the async instance mounts are no-ops. */
	export function play(): Promise<void> | undefined {
		return instance?.play?.();
	}
	export function pause(): void {
		instance?.pause?.();
	}
	export function togglePlay(): void {
		instance?.togglePlay?.();
	}
	export function seekTo(seconds: number): void {
		instance?.seekTo?.(seconds);
	}
	export function seekToPercent(percent: number): void {
		instance?.seekToPercent?.(percent);
	}
	export function setVolume(volume: number): void {
		instance?.setVolume?.(volume);
	}
	export function setPlaybackRate(rate: number): void {
		instance?.setPlaybackRate?.(rate);
	}
	export function setPlayingState(playing: boolean): void {
		instance?.setPlayingState?.(playing);
	}
	export function setProgress(currentTime: number, duration: number): void {
		instance?.setProgress?.(currentTime, duration);
	}
	export async function loadTrack(
		url: string,
		title?: string,
		artist?: string,
		options?: Record<string, unknown>
	): Promise<void> {
		if (!instance?.loadTrack) return;
		await instance.loadTrack(url, title, artist, options);
	}
	export function getInstance(): WaveformPlayerInstance | null {
		return instance as unknown as WaveformPlayerInstance | null;
	}
</script>

<div bind:this={container} class={`wfp-host ${className}`.trim()} {...rest}></div>
