/**
 * @module @arraypress/waveform-player-svelte
 * @description
 * Public entry point for the Svelte 5 wrapper around
 * `@arraypress/waveform-player`.
 *
 * ```svelte
 * <script lang="ts">
 *   import { WaveformPlayer } from '@arraypress/waveform-player-svelte';
 * </script>
 *
 * <WaveformPlayer url="/audio/track.mp3" title="My Track" />
 * ```
 *
 * ## Types
 *
 * ```ts
 * import type {
 *   WaveformPlayerProps,
 *   WaveformPlayerCallbacks,
 *   WaveformPlayerExpose,
 *   WaveformStyle,
 *   WaveformMarker,
 *   WaveformPeaks,
 *   ColorPreset,
 *   AudioMode,
 *   AudioPreload,
 *   ButtonAlign,
 * } from '@arraypress/waveform-player-svelte';
 * ```
 */
export { default as WaveformPlayer } from './WaveformPlayer.svelte';

export type {
	WaveformPlayerProps,
	WaveformPlayerCallbacks,
	WaveformPlayerExpose,
	WaveformStyle,
	WaveformMarker,
	WaveformPeaks,
	ColorPreset,
	AudioMode,
	AudioPreload,
	ButtonAlign,
} from './types.js';
