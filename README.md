<div align="center">

# Waveform Player for Svelte

**Svelte 5 component wrapper for [`@arraypress/waveform-player`](https://github.com/arraypress/waveform-player).**
Typed props for every option, callback props, an exported imperative API, and SSR-safe mounting.

[![npm version](https://img.shields.io/npm/v/@arraypress/waveform-player-svelte?style=flat-square&labelColor=09090b&color=3f3f46)](https://www.npmjs.com/package/@arraypress/waveform-player-svelte)
[![license](https://img.shields.io/npm/l/@arraypress/waveform-player-svelte?style=flat-square&labelColor=09090b&color=3f3f46)](https://github.com/arraypress/waveform-player-svelte/blob/main/LICENSE)

**[Documentation](https://docs.waveformplayer.com/)** &middot; [npm](https://www.npmjs.com/package/@arraypress/waveform-player-svelte)

</div>

---

## Install

```bash
npm install @arraypress/waveform-player-svelte @arraypress/waveform-player svelte
```

```svelte
<script lang="ts">
  import { WaveformPlayer } from '@arraypress/waveform-player-svelte';
  import '@arraypress/waveform-player/dist/waveform-player.css';
</script>

<WaveformPlayer url="/track.mp3" title="My Song" artist="The Artist" />
```

## Documentation

Full props, the imperative API, styling, and framework guides live on the docs site.

### -> [docs.waveformplayer.com](https://docs.waveformplayer.com/)

[Svelte guide](https://docs.waveformplayer.com/frameworks/svelte/) — install, props, the imperative API, and SSR notes. All four Svelte wrappers (player / bar / playlist) are on that page.

## License

MIT © [ArrayPress](https://github.com/arraypress)
