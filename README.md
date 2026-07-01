# @arraypress/waveform-player-svelte

Svelte 5 component wrapper around [`@arraypress/waveform-player`](https://github.com/arraypress/waveform-player). Typed props for every library option, lifecycle callback props, an exported imperative API (`play() / pause() / seekTo() / loadTrack()`), and SSR-safe mounting.

The core library stays a zero-dependency vanilla-JS package that works anywhere a `<script>` tag does. This package adds the framework-native ergonomics Svelte developers expect — built with runes.

```svelte
<script lang="ts">
  import { WaveformPlayer } from '@arraypress/waveform-player-svelte';
</script>

<WaveformPlayer url="/audio/track.mp3" title="My Track" />
```

## Installation

```bash
npm install @arraypress/waveform-player-svelte @arraypress/waveform-player svelte
```

`svelte` (^5) and `@arraypress/waveform-player` (^1.8) are peer dependencies — you bring them so you control the versions.

## Setup

Import the core library's CSS **once** in your app entry (SvelteKit `+layout.svelte`, or `main.ts` for a plain Vite app):

```ts
import '@arraypress/waveform-player/dist/waveform-player.css';
```

The wrapper does **not** import the CSS for you — your bundler should own that decision. The library's JS is loaded dynamically inside a `$effect` (which only runs in the browser), so SSR / SvelteKit prerendering doesn't trip over the browser-only audio APIs.

## Usage

### Basic

```svelte
<WaveformPlayer src="/audio/track.mp3" />
```

> **Naming note.** `src` is shorthand for `url` (`url` wins if both are set). The visual style is `waveformStyle` — **not** `style`, which (as on any element) is CSS. `class`, `style`, `id`, and other element attributes fall through to the host element; the base class `wfp-host` is always applied.

### With metadata + chosen style

```svelte
<WaveformPlayer
  url="/audio/track.mp3"
  title="Midnight Dreams"
  artist="The Wavelength"
  artwork="/img/cover.jpg"
  waveformStyle="bars"
  barWidth={3}
  barSpacing={1}
  height={80}
/>
```

### Pre-computed peaks (recommended for catalogues)

```svelte
<WaveformPlayer url="/audio/track.mp3" waveform="/peaks/track.json" />
```

Generate the JSON at build time with [`@arraypress/waveform-gen`](https://github.com/arraypress/waveform-gen). Removes the Web Audio decode cost (~1–5 s per file) from the render path.

### Chapter markers

```svelte
<script lang="ts">
  import { WaveformPlayer, type WaveformMarker } from '@arraypress/waveform-player-svelte';
  const markers: WaveformMarker[] = [
    { time: 0, label: 'Intro' },
    { time: 60, label: 'Main topic', color: '#a855f7' },
    { time: 600, label: 'Q&A' },
  ];
</script>

<WaveformPlayer url="/audio/podcast.mp3" {markers} />
```

### Callback props

Every lifecycle event the core exposes is a lowercase callback prop, each forwarding the live instance:

```svelte
<WaveformPlayer
  url="/audio/track.mp3"
  onload={(i) => console.log('loaded', i)}
  onplay={() => console.log('playing')}
  onpause={() => console.log('paused')}
  ontimeupdate={(currentTime, duration) => console.log(`${currentTime}s / ${duration}s`)}
  onend={() => console.log('finished')}
  onerror={(err) => console.error('audio failed:', err)}
/>
```

| Prop           | Signature                                                       |
| -------------- | --------------------------------------------------------------- |
| `onload`       | `(instance) => void`                                            |
| `onplay`       | `(instance) => void`                                            |
| `onpause`      | `(instance) => void`                                            |
| `onend`        | `(instance) => void`                                            |
| `ontimeupdate` | `(currentTime: number, duration: number, instance) => void`     |
| `onerror`      | `(error: Error, instance) => void`                              |

Callback props **don't trigger re-mounts** — they reach the live instance through reactive closures, so changing a handler never tears the player down.

### Imperative control via bind:this

For "play this track when X happens" flows where wiring through props is awkward:

```svelte
<script lang="ts">
  import { WaveformPlayer } from '@arraypress/waveform-player-svelte';
  let player: WaveformPlayer;
</script>

<WaveformPlayer bind:this={player} url="/audio/track.mp3" />
<button onclick={() => player.togglePlay()}>Play / Pause</button>
<button onclick={() => player.seekTo(30)}>Jump to 0:30</button>
<button onclick={() => player.setVolume(0.5)}>Vol 50%</button>
```

The exported methods (`play()`, `pause()`, `togglePlay()`, `seekTo()`, `seekToPercent()`, `setVolume()`, `setPlaybackRate()`, `setPlayingState()`, `setProgress()`, `loadTrack()`) pass straight through to the underlying instance. `player.getInstance()` returns the raw instance for anything not surfaced yet.

### External audio mode

When pairing with `@arraypress/waveform-bar` (or any audio controller you own), the player can render visualisation only and surrender playback:

```svelte
<WaveformPlayer
  url={track.url}
  audioMode="external"
  waveformStyle="seekbar"
  showInfo={false}
/>
```

Drive the visualisation from your controller via `player.setProgress(currentTime, duration)` and `player.setPlayingState(playing)`.

## How prop changes are handled

When **any** prop the core library uses at construction time changes (`url`, `audioMode`, `waveformStyle`, `markers`, colours, sizing, …), the wrapper destroys the existing instance and creates a new one with the updated options — driven by a single `$effect` that reads those props. That's simpler and more correct than diffing every option, and the core has built-in caches (waveform peaks keyed by URL) that make same-URL re-mounts cheap.

## Props

Every library option surfaces as a typed prop. Absent props are not forwarded, so the core library's own defaults apply. See [`src/lib/types.ts`](./src/lib/types.ts) and [`src/lib/WaveformPlayer.svelte`](./src/lib/WaveformPlayer.svelte) for the full list, and the [core docs](https://docs.waveformplayer.com) for per-option behaviour. Highlights:

- **Audio source** — `url`, `src` (alias), `audioMode`, `preload`
- **Waveform** — `waveformStyle`, `height`, `samples`, `barWidth`, `barSpacing`, `barRadius`, `waveform`
- **Colours** — `colorPreset`, `waveformColor`, `progressColor`, `buttonColor`, … (strings, or `string[]` for gradients)
- **Playback / UI** — `playbackRate`, `showPlaybackSpeed`, `playbackRates`, `showControls`, `showInfo`, `showTime`, `showHoverTime`, `showBPM`, `buttonAlign`, `accessibleSeek`, `seekLabel`, `errorText`
- **Markers / metadata** — `markers`, `showMarkers`, `title`, `artist`, `artwork`, `album`
- **Behaviour / icons** — `autoplay`, `singlePlay`, `playOnSeek`, `enableMediaSession`, `playIcon`, `pauseIcon`

## TypeScript

```ts
import type {
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
} from '@arraypress/waveform-player-svelte';
```

The shared option types are re-exported straight from the core library, so they can never drift out of sync. The package ships `.svelte` + `.d.ts` (generated by `svelte-package`).

## Testing

```bash
npm test          # one-shot
npm run test:watch
npm run typecheck  # svelte-check
npm run build      # svelte-package → dist/
```

The core library is mocked at the module boundary (jsdom has no Web Audio API). Tests cover mount, option pass-through, the `src → url` alias, boolean-prop omission, callback forwarding, destroy-on-unmount, identity-prop re-mount, and the exported imperative API.

## License

MIT © ArrayPress
