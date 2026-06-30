<!--
  examples/Basic.svelte
  ---------------------

  Reference Svelte 5 component demonstrating every <WaveformPlayer>
  usage pattern this package supports. Copy/paste into your own Svelte
  / SvelteKit app to see the wrapper in action.

  Library setup (do this ONCE in your app entry — e.g. SvelteKit's
  `+layout.svelte` or `main.ts`):

    import '@arraypress/waveform-player/dist/waveform-player.css';

  The wrapper does NOT auto-import the CSS for you — your bundler should
  own that decision.
-->
<script lang="ts">
	import {
		WaveformPlayer,
		type WaveformMarker,
	} from '@arraypress/waveform-player-svelte';

	/* Imperative control via bind:this. */
	let player: WaveformPlayer;

	/* Chapter markers (clickable seek points). */
	const markers: WaveformMarker[] = [
		{ time: 0, label: 'Intro' },
		{ time: 60, label: 'Main topic', color: '#a855f7' },
		{ time: 600, label: 'Q&A' },
	];

	/* Dynamic track switching. */
	let trackUrl = $state('/audio/track-1.mp3');
</script>

<!-- 1 — Minimal -->
<WaveformPlayer src="/audio/track.mp3" />

<!-- 2 — Metadata, chosen style, and callbacks. `waveformStyle` picks
     the look; `class`/`style`/`id` fall through to the host element. -->
<WaveformPlayer
	url="/audio/track.mp3"
	title="Midnight Dreams"
	subtitle="The Wavelength"
	artwork="/img/cover.jpg"
	waveformStyle="bars"
	barWidth={3}
	barSpacing={1}
	height={80}
	onplay={() => console.log('playing')}
	onpause={() => console.log('paused')}
	ontimeupdate={(t, d) => console.log(`${t} / ${d}`)}
/>

<!-- 3 — Pre-computed peaks for instant load (recommended for catalogues) -->
<WaveformPlayer url="/audio/track.mp3" waveform="/peaks/track.json" />

<!-- 4 — Chapter markers -->
<WaveformPlayer url="/audio/podcast.mp3" title="Episode 42" {markers} height={80} />

<!-- 5 — Imperative control via bind:this -->
<WaveformPlayer bind:this={player} url="/audio/track.mp3" title="Controlled" />
<div style="display: flex; gap: 0.5rem; margin-top: 1rem">
	<button onclick={() => player.play()}>Play</button>
	<button onclick={() => player.pause()}>Pause</button>
	<button onclick={() => player.seekTo(30)}>Skip to 0:30</button>
	<button onclick={() => player.setVolume(0.5)}>Vol 50%</button>
</div>

<!-- 6 — Dynamic track switching. `{#key}` forces a clean remount; the
     wrapper would also re-mount on url change via its own effect. -->
{#key trackUrl}
	<WaveformPlayer url={trackUrl} title="Now playing" />
{/key}
<select bind:value={trackUrl}>
	<option value="/audio/track-1.mp3">Track 1</option>
	<option value="/audio/track-2.mp3">Track 2</option>
</select>

<!-- 7 — External audio mode (paired with @arraypress/waveform-bar) -->
<WaveformPlayer
	url="/audio/track.mp3"
	audioMode="external"
	waveformStyle="seekbar"
	showInfo={false}
	height={32}
/>
