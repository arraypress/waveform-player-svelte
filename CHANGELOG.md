# Changelog

All notable changes to `@arraypress/waveform-player-svelte` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Added

- **`onnexttrack` / `onprevioustrack` callback props.** Supplying one shows the
  lock-screen / system media controls' skip button and forwards to the core's
  `onNextTrack` / `onPreviousTrack`. The core options were already typed on
  `WaveformPlayerProps` but never forwarded (they fell into `...rest`), so the
  buttons never appeared. They're passed only when set — the core shows the
  button whenever the option is a function — and adding or removing one
  remounts the player, while swapping in a fresh inline handler doesn't.
- **Forwarding-drift test.** `test/forwarding-drift.test.ts` enumerates the
  installed core's option surface (`DEFAULT_OPTIONS` plus the
  `WaveformPlayerOptions` keys) and fails for any option that isn't forwarded,
  doesn't remount on change, or isn't listed in `NOT_FORWARDED` with a reason —
  so the next core option can't be dropped the way the ones above were.
  Remounts are checked through a fine-grained parent (`test/Harness.svelte`),
  because testing-library's `rerender()` invalidates every prop at once.
  Test-only; adds `@types/node` as a dev dependency.

### Changed

- **`style` is typed as the host `<div>`'s CSS attribute.** `WaveformPlayerProps`
  now omits the core's `style` (a shorthand alias for `waveformStyle`), which
  typed `style` as a `WaveformStyle` while the component spread it onto the
  element as CSS. Matches the other wrappers: use `waveformStyle` for the visual
  style. The camelCase `onNextTrack` / `onPreviousTrack` are omitted too, in
  favour of the lowercase props above.

### Fixed

- **`waveformGradient` and `seekHandle` now reach the player.** Both have been
  typed props since the core added them (1.18.0 / 1.17.0), but they weren't in
  the `$props()` destructure, so they fell into `...rest` and were spread onto
  the host `<div>` as attributes instead.
- **`setPlaybackRate` documents the real range** — `0.25..4`, what the core
  clamps to — instead of `0.5..2`.

## [0.6.0] — 2026-09-22

### Changed

- **Loads `@arraypress/waveform-player/no-autoinit` instead of the package
  root.** Importing the root scans the whole document for
  `[data-waveform-player]` markup and builds a player for every match. This
  component constructs its own player on its own ref and wants none of that.
  In a pure Svelte app the scan found nothing and merely cost a
  `querySelectorAll`; as an island on a page that *does* carry such markup — a
  CMS page, a WordPress template, an Astro or Rails view — mounting this
  component silently mounted players the Svelte app never asked for, and owned
  them for the rest of the page's life. Same class, same options, same
  behaviour for everything this component builds; the only thing that changes
  is that nothing else on the page gets touched.

### Breaking

- **Peer floor raised to `@arraypress/waveform-player@^1.27.0`**, the release
  that added the `/no-autoinit` entry point. This is the first hard floor in
  the family rather than the usual soft one: on an older core the subpath does
  not exist, so it fails at mount, in the browser. Bump the core alongside this
  package.

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
