# Changelog

All notable changes to `@arraypress/waveform-player-svelte` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Unreleased

Initial release.

### Added

- `<WaveformPlayer>` Svelte 5 component (built with runes) wrapping
  every option exposed by `@arraypress/waveform-player` as a typed prop:
  - Audio source (`url`, `src` alias, `audioMode`, `preload`)
  - Waveform visualisation (`waveformStyle`, `height`, `samples`,
    `barWidth`, `barSpacing`, `barRadius`, `waveform`)
  - Colours (`colorPreset`, `waveformColor`, `progressColor`,
    `buttonColor`, `buttonHoverColor`, `textColor`,
    `textSecondaryColor`, `backgroundColor`, `borderColor` — strings or
    `string[]` gradients)
  - Playback (`playbackRate`, `showPlaybackSpeed`, `playbackRates`)
  - UI toggles (`showControls`, `showInfo`, `showTime`, `showHoverTime`,
    `showBPM`, `buttonAlign`, `accessibleSeek`, `seekLabel`, `errorText`)
  - Markers (`markers`, `showMarkers`)
  - Metadata (`title`, `subtitle`, `artwork`, `album`)
  - Behaviour (`autoplay`, `singlePlay`, `playOnSeek`,
    `enableMediaSession`)
  - Icons (`playIcon`, `pauseIcon`)
- Lowercase lifecycle callback props (`onload`, `onplay`, `onpause`,
  `onend`, `ontimeupdate`, `onerror`), each forwarding the live
  `WaveformPlayer` instance. Wired through reactive closures, so
  changing a handler never tears the player down.
- Imperative API exported by the component instance (reachable via
  `bind:this`): `play()`, `pause()`, `togglePlay()`, `seekTo()`,
  `seekToPercent()`, `setVolume()`, `setPlaybackRate()`,
  `setPlayingState()`, `setProgress()`, `loadTrack()`, and
  `getInstance()`.
- `class`, `style`, `id`, and other element attributes fall through to
  the host element via `...rest`; the base class `wfp-host` always
  applies.
- SSR / SvelteKit safe: the core library is loaded via dynamic
  `import('@arraypress/waveform-player')` inside a browser-only
  `$effect`, so the audio surface never runs server-side.
- Identity-prop re-mount: a single `$effect` reads every
  construction prop, so changing any of them destroys the existing
  instance and creates a new one. A monotonic mount token discards any
  in-flight async import that a newer mount (or unmount) has superseded.
- Public types adopted from the core `@arraypress/waveform-player`
  (`WaveformStyle`, `ColorPreset`, `AudioMode`, `AudioPreload`,
  `ButtonAlign`, `WaveformMarker`, `WaveformPeaks`), re-exported here so
  the wrapper's types can never drift. `WaveformPlayerProps` is derived
  from the core's `WaveformPlayerOptions`.
- Built with `svelte-package` (`dist/` ships the preprocessed
  `.svelte` + generated `.d.ts`). Svelte + the core library are peer
  dependencies.
- Vitest test suite (jsdom + `@testing-library/svelte`) covering mount,
  option pass-through, the `src → url` alias, boolean-prop omission,
  callback forwarding, destroy-on-unmount, identity-prop re-mount, and
  the exported imperative API. The core is mocked at the module
  boundary because jsdom has no Web Audio API.
- README with full prop reference, seven usage patterns, and the
  imperative `bind:this` control example. `examples/Basic.svelte` with
  seven copy-paste-ready snippets.
