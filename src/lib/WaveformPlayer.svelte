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
	import { untrack } from 'svelte';
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
		crossOrigin,
		// ── Waveform visualisation ─────────────────────────────────────
		waveformStyle,
		height,
		samples,
		barWidth,
		barSpacing,
		barRadius,
		waveformGradient,
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
		seekHandle,
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
		onnexttrack,
		onprevioustrack,
		// ── Host element ───────────────────────────────────────────────
		class: className = '',
		...rest
	}: Props = $props();

	let container: HTMLDivElement;
	let instance: PlayerInstance | null = null;

	/*
	 * Host `class` handling.
	 *
	 * The core owns part of the host's class list: `createDOM()` resets it to
	 * `waveform-player` (+ `waveform-layout-preview`, `waveform-theme-light`)
	 * and later paths toggle `waveform-is-placeholder`. If Svelte owned the
	 * `class` attribute, a class-only change — which rightly doesn't remount —
	 * would rewrite it and strip those classes for good.
	 *
	 * So the markup binds a class value frozen at init (`renderedClass`; SSR
	 * and hydration still carry the user's classes), which Svelte never
	 * rewrites because it never changes. Later `class` changes are applied by
	 * the effect below with `classList`, touching only the tokens this
	 * component put there.
	 *
	 * Chosen over mounting the core into an inner element (which would leave
	 * Svelte's element alone by construction) because that changes the DOM
	 * users style: `--wfp-*` variables set through `style` / `class` would
	 * land on a parent, where the core's own `.waveform-player { --wfp-…: … }`
	 * defaults shadow them.
	 */
	const hostClass = $derived(`wfp-host ${className ?? ''}`.trim());
	const renderedClass = untrack(() => hostClass);
	let appliedClasses = classTokens(renderedClass);

	/** Split a class string into its tokens (empty strings dropped). */
	function classTokens(value: string): string[] {
		return value.split(/\s+/).filter(Boolean);
	}

	/**
	 * Bring the host's *user* classes (`wfp-host` + `class`) up to date
	 * without touching anything else on the element: drop the tokens applied
	 * last time that are no longer wanted, then (re-)add every wanted token.
	 * `classList.add` is idempotent, so this is also how they come back after
	 * the core's `createDOM()` resets the host's whole class list.
	 */
	function applyHostClasses(value: string) {
		if (!container) return;
		const wanted = classTokens(value);
		for (const token of appliedClasses) {
			if (!wanted.includes(token)) container.classList.remove(token);
		}
		if (wanted.length) container.classList.add(...wanted);
		appliedClasses = wanted;
	}

	$effect(() => applyHostClasses(hostClass));
	/* Monotonic token: every (re)mount bumps it; an in-flight async
	 * import whose token is stale bails instead of attaching a zombie. */
	let token = 0;

	/*
	 * Whether a track-navigation handler is supplied. Unlike the other
	 * callbacks these can't be wired unconditionally: the core registers the
	 * Media Session `nexttrack` / `previoustrack` action (the lock-screen skip
	 * buttons) whenever the option is a function, so an always-on wrapper
	 * would show buttons that do nothing. `$derived` only notifies when the
	 * boolean flips, so adding/removing a handler remounts but swapping one
	 * for a fresh inline function doesn't.
	 */
	const hasNextTrack = $derived(typeof onnexttrack === 'function');
	const hasPreviousTrack = $derived(typeof onprevioustrack === 'function');

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
		set('crossOrigin', crossOrigin);

		set('waveformStyle', waveformStyle);
		set('height', height);
		set('samples', samples);
		set('barWidth', barWidth);
		set('barSpacing', barSpacing);
		set('barRadius', barRadius);
		set('waveformGradient', waveformGradient);
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
		set('seekHandle', seekHandle);
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

		/* Track navigation — presence is read here (inside the effect) so it
		 * is a remount trigger; the closures read the latest handler. */
		if (hasNextTrack) opts.onNextTrack = (i: WaveformPlayerInstance) => onnexttrack?.(i);
		if (hasPreviousTrack) opts.onPreviousTrack = (i: WaveformPlayerInstance) => onprevioustrack?.(i);

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

		/* `/no-autoinit` rather than the package root: importing the root scans
		 * the whole document for `[data-waveform-player]` markup and builds a
		 * player for every match. This component constructs its own player on
		 * its own ref and wants none of that — and as an island on a page that
		 * *does* carry such markup (a CMS page, a WordPress template), the root
		 * entry would silently mount players the Svelte app never asked for.
		 * Same class, same options; the only thing it drops is the scan. Needs
		 * core >= 1.27.0, which is why the peer floor is hard rather than
		 * soft. */
		import('@arraypress/waveform-player/no-autoinit')
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
				/* createDOM() just replaced the host's class list with the
				 * core's own; put `wfp-host` + `class` back beside it. */
				applyHostClasses(untrack(() => hostClass));
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

<!-- `class` is frozen at init — see "Host `class` handling" above. -->
<div bind:this={container} class={renderedClass} {...rest}></div>
