# Changelog

All notable changes to `@arraypress/waveform-player-svelte` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.5.0] — 2026-07-22

### Added

- **`crossOrigin` prop.** Exposes the option added in
  `@arraypress/waveform-player@1.23.0`: sets the CORS mode of the underlying
  `<audio>` (`'anonymous'` | `'use-credentials'`). Omitted from the options bag
  by default so the player behaves like a native `<audio>` and never forces a
  CORS request that would break CDN media without `Access-Control-Allow-Origin`.

## [0.4.0] — 2026-07-17

### Added

- **`buttonRadius` and `artworkPosition` props.** Exposes the two options added
  in `@arraypress/waveform-player` 1.22.0: `buttonRadius` sets the play button's
  corner radius (`0` for square, or any CSS length), and `artworkPosition`
  (`'info'` | `'button'`) chooses whether the cover renders in the info row or
  becomes the play button itself.

  Both prop *types* already flowed through automatically, since the props derive
  from the core's `WaveformPlayerOptions` — but the options mapping is written by hand, so
  until now they would have type-checked and then silently done nothing. Tests
  now cover the mapping for exactly that reason.

  The peer range stays `^1.20.0`: the props only appear once the consumer's own
  core is on 1.22.0, so nothing breaks on an older one.

## [0.3.0] — 2026-07-05

### Added

- Forward the core player's new localizable UI-string options —
  `seekValueText`, `playPauseLabel`, `speedLabel`, `artworkAlt`, and
  `unknownTrackText` — through to the underlying player. Requires
  `@arraypress/waveform-player@^1.20.0`.

## [0.1.0] — Unreleased

Initial release.

### Added

- `<WaveformPlayer>` Svelte 5 component (built with runes) wrapping
  every option exposed by `@arraypress/waveform-player` as a typed prop:
  - Audio source (`url`, `src` alias, `audioMode`, `preload`)
  - Waveform visualisation (`waveformStyle`, `height`, `samples`,
    `barWidth`, `barSpacing`, `barRadius`, `waveform`)
  - Colours (`colorPreset`, `waveformColor`, `progressColor` — strings
    or `string[]` gradients). DOM chrome (button, title, meta text) is
    themed via CSS variables (`--wfp-button-color`, `--wfp-text-color`,
    `--wfp-text-secondary-color`), not JS options.
  - Playback (`playbackRate`, `showPlaybackSpeed`, `playbackRates`)
  - UI toggles (`showControls`, `showInfo`, `showTime`, `showHoverTime`,
    `showBPM`, `buttonAlign`, `accessibleSeek`, `seekLabel`, `errorText`)
  - Markers (`markers`, `showMarkers`)
  - Metadata (`title`, `artist`, `artwork`, `album`)
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
