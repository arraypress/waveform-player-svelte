/**
 * @module types
 * @description
 * Public TypeScript types for `@arraypress/waveform-player-svelte`.
 *
 * The shared option surface — `WaveformStyle`, `ColorPreset`,
 * `AudioMode`, `AudioPreload`, `ButtonAlign`, `WaveformMarker`,
 * `WaveformPeaks`, and the full per-option list behind
 * `WaveformPlayerProps` — is owned by the core library and re-exported
 * / extended here rather than re-declared. The core's hand-authored
 * `index.d.ts` is the single source of truth, so these types can never
 * drift out of sync with it.
 *
 * This module only adds the Svelte-specific surface:
 *
 *   - `WaveformPlayerProps` — the option surface accepted as props (the
 *     core options minus the callback fields).
 *   - `WaveformPlayerCallbacks` — the lowercase callback props
 *     (`onload`, `onplay`, …) Svelte components accept as attributes.
 *   - `WaveformPlayerExpose` — the imperative API exported by the
 *     component instance, reachable through `bind:this`.
 *
 * @see {@link https://github.com/arraypress/waveform-player} — core library
 */
import type {
	WaveformPlayer,
	WaveformPlayerOptions,
} from '@arraypress/waveform-player';

/**
 * Shared option types re-exported from the core library so consumers
 * importing them from this package keep working. These are the
 * single-source-of-truth definitions shipped by
 * `@arraypress/waveform-player` — not local copies.
 */
export type {
	WaveformStyle,
	ColorPreset,
	AudioMode,
	AudioPreload,
	ButtonAlign,
	WaveformMarker,
	WaveformPeaks,
} from '@arraypress/waveform-player';

/**
 * The option surface accepted by `<WaveformPlayer>` as props.
 *
 * Derived from the core library's `WaveformPlayerOptions` so every
 * library option is a typed prop automatically and stays in sync as
 * the core evolves. The core's callback options are omitted —
 * lowercase Svelte callback props (`onload`, `onplay`, …) cover those
 * (see `WaveformPlayerCallbacks`).
 */
export type WaveformPlayerProps = Omit<
	WaveformPlayerOptions,
	'onLoad' | 'onPlay' | 'onPause' | 'onEnd' | 'onError' | 'onTimeUpdate'
>;

/**
 * Lifecycle callback props. Each maps to the core library's same-named
 * option callback and forwards the live `WaveformPlayer` instance.
 * Lowercase to match Svelte's native event-attribute convention
 * (`onclick`, `oninput`, …).
 *
 * ```svelte
 * <WaveformPlayer onplay={(i) => …} ontimeupdate={(t, d) => …} />
 * ```
 */
export interface WaveformPlayerCallbacks {
	/** Fired once after the player's `onLoad`. */
	onload?: (instance: WaveformPlayer) => void;
	/** Fired when playback starts. */
	onplay?: (instance: WaveformPlayer) => void;
	/** Fired when playback pauses. */
	onpause?: (instance: WaveformPlayer) => void;
	/** Fired when the track ends. */
	onend?: (instance: WaveformPlayer) => void;
	/** Fired on each progress frame. */
	ontimeupdate?: (currentTime: number, duration: number, instance: WaveformPlayer) => void;
	/** Fired on audio load / playback error. */
	onerror?: (error: Error, instance: WaveformPlayer) => void;
}

/**
 * Imperative API exported by the component instance. Reach it with
 * `bind:this`:
 *
 * ```svelte
 * <script lang="ts">
 *   import { WaveformPlayer } from '@arraypress/waveform-player-svelte';
 *   let player: WaveformPlayer;
 * </script>
 *
 * <WaveformPlayer bind:this={player} url="/audio/track.mp3" />
 * <button onclick={() => player.seekTo(60)}>Jump to 1:00</button>
 * ```
 *
 * Each method is a thin pass-through to the underlying
 * `WaveformPlayer` instance; calls before the async instance mounts
 * are no-ops.
 */
export interface WaveformPlayerExpose {
	/** Start playback. Returns the native `play()` promise in self-mode. */
	play(): Promise<void> | undefined;
	/** Pause playback. */
	pause(): void;
	/** Toggle play / pause. */
	togglePlay(): void;
	/** Seek to a specific time in seconds. Self-mode only. */
	seekTo(seconds: number): void;
	/** Seek to a percentage of total duration (0..1). Self-mode only. */
	seekToPercent(percent: number): void;
	/** Set output volume (0..1). Self-mode only. */
	setVolume(volume: number): void;
	/** Set playback rate (0.5..2). Self-mode only. */
	setPlaybackRate(rate: number): void;
	/** External-mode only: push the play/pause state into the player. */
	setPlayingState(playing: boolean): void;
	/** External-mode only: push the current playback position into the player. */
	setProgress(currentTime: number, duration: number): void;
	/** Load a new track without remounting the component. */
	loadTrack(
		url: string,
		title?: string,
		artist?: string,
		options?: Record<string, unknown>
	): Promise<void>;
	/** Underlying `WaveformPlayer` instance, for the full core API. */
	getInstance(): WaveformPlayer | null;
}
