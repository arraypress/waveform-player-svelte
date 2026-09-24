# CLAUDE.md — @arraypress/waveform-player-svelte

Svelte 5 wrapper for `@arraypress/waveform-player`.

## Commands
- `npm test` — vitest + jsdom (run before committing).
- `npm run build` — bundles to `dist/`. `prepublishOnly` runs it. `dist/` is gitignored.

## The rule that matters: an undestructured prop vanishes

`src/lib/WaveformPlayer.svelte`. A new option needs **both**:
1. Add it to the `$props()` destructure (~line 117).
2. `set('<key>', <key>);` in `buildOptions`.

Step 1 is the trap unique to this wrapper: a prop that isn't destructured falls
into `...rest`, is spread onto the DOM element, and is **never forwarded to the
player**. No error, no warning, typechecks clean.

`test/forwarding-drift.test.ts` enumerates the installed core's option surface
and fails on either miss. A deliberately unforwarded option goes in its
`NOT_FORWARDED` map with a reason; a new option with a `null` default needs a
sample value in `test/core-options.ts` (the test says so). Remount assertions
go through `test/Harness.svelte` — testing-library's `rerender()` invalidates
every prop at once, so it remounts even for props the component never reads.

## Conventions
- Prop **types** derive from core's `WaveformPlayerOptions` via `Omit<>` — never
  re-declare the option surface here.
- `style` stays Svelte's CSS prop — the visual style prop is `waveformStyle`.
- Add a mirror test under `test/` + a `CHANGELOG.md` entry.

## Cross-repo
One of 15 packages that must change together — load the `waveform-release` skill.
