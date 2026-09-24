/**
 * WaveformPlayer.test.ts
 * ----------------------
 *
 * The core `@arraypress/waveform-player` library is mocked at the
 * module boundary (jsdom has no Web Audio / Canvas). These tests cover
 * the wrapper's own responsibilities: rendering the host element,
 * constructing the instance with mapped options, the `src → url`
 * alias, boolean-prop omission (so the core's defaults win), callback
 * forwarding, destroy-on-unmount, identity-prop re-mount, and the
 * exported imperative API.
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import type { WaveformPlayerCallbacks, WaveformPlayerProps } from '../src/lib/types.js';

/** Captures every constructed instance so assertions can inspect them. */
const instances: MockPlayer[] = [];

class MockPlayer {
	el: HTMLElement;
	opts: Record<string, unknown>;
	play = vi.fn();
	pause = vi.fn();
	togglePlay = vi.fn();
	seekTo = vi.fn();
	seekToPercent = vi.fn();
	setVolume = vi.fn();
	setPlaybackRate = vi.fn();
	setPlayingState = vi.fn();
	setProgress = vi.fn();
	loadTrack = vi.fn(async () => {});
	destroy = vi.fn();
	/** Optional per-test stand-in for the core's DOM work on the host. */
	static onConstruct: ((el: HTMLElement) => void) | null = null;
	constructor(el: HTMLElement, opts: Record<string, unknown>) {
		this.el = el;
		this.opts = opts;
		instances.push(this);
		MockPlayer.onConstruct?.(el);
	}
}

/**
 * The package root must never be imported: it scans the whole document on
 * import and mounts a player for every `[data-waveform-player]` it finds, which
 * is markup this Svelte app does not own. A mock factory only runs when its module is
 * actually imported, so this throws if and only if the component reaches for
 * the scanning entry point — turning a silent behaviour regression into a
 * failure that names itself.
 */
vi.mock('@arraypress/waveform-player', () => {
	throw new Error(
		'[test] component imported the scanning entry point; it must import @arraypress/waveform-player/no-autoinit'
	);
});

vi.mock('@arraypress/waveform-player/no-autoinit', () => ({
	default: MockPlayer,
	WaveformPlayer: MockPlayer,
}));

import WaveformPlayer from '../src/lib/WaveformPlayer.svelte';
import Harness from './Harness.svelte';

const firstInstance = () => vi.waitFor(() => expect(instances.length).toBeGreaterThan(0));

beforeEach(() => {
	instances.length = 0;
	MockPlayer.onConstruct = null;
});

describe('WaveformPlayer (Svelte)', () => {
	it('renders a div.wfp-host', () => {
		const { container } = render(WaveformPlayer, { props: { url: '/a.mp3' } });
		expect(container.querySelector('div.wfp-host')).not.toBeNull();
	});

	it('constructs the core instance with the container and url', async () => {
		const { container } = render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect(instances).toHaveLength(1);
		expect(instances[0].opts.url).toBe('/a.mp3');
		expect(instances[0].el).toBe(container.querySelector('div.wfp-host'));
	});

	it('aliases src → url', async () => {
		render(WaveformPlayer, { props: { src: '/b.mp3' } });
		await firstInstance();
		expect(instances[0].opts.url).toBe('/b.mp3');
	});

	it('prefers url over src when both are set', async () => {
		render(WaveformPlayer, { props: { url: '/win.mp3', src: '/lose.mp3' } });
		await firstInstance();
		expect(instances[0].opts.url).toBe('/win.mp3');
	});

	it('passes option props through', async () => {
		render(WaveformPlayer, {
			props: { url: '/a.mp3', waveformStyle: 'bars', height: 80, samples: 120 },
		});
		await firstInstance();
		expect(instances[0].opts).toMatchObject({ waveformStyle: 'bars', height: 80, samples: 120 });
	});

	it('omits absent props so the core defaults win', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect('showControls' in instances[0].opts).toBe(false);
		expect('autoplay' in instances[0].opts).toBe(false);
	});

	it('forwards explicit boolean props (including false)', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3', showControls: false, autoplay: true } });
		await firstInstance();
		expect(instances[0].opts.showControls).toBe(false);
		expect(instances[0].opts.autoplay).toBe(true);
	});

	it('forwards lifecycle callbacks', async () => {
		const onplay = vi.fn();
		const ontimeupdate = vi.fn();
		render(WaveformPlayer, { props: { url: '/a.mp3', onplay, ontimeupdate } });
		await firstInstance();
		const o = instances[0].opts as Record<string, (...args: unknown[]) => void>;
		o.onPlay(instances[0]);
		o.onTimeUpdate(1, 2, instances[0]);
		expect(onplay).toHaveBeenCalledWith(instances[0]);
		expect(ontimeupdate).toHaveBeenCalledWith(1, 2, instances[0]);
	});

	it('destroys the instance on unmount', async () => {
		const { unmount } = render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		const inst = instances[0];
		unmount();
		expect(inst.destroy).toHaveBeenCalledTimes(1);
	});

	it('re-mounts when url changes', async () => {
		const { rerender } = render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		const first = instances[0];
		await rerender({ url: '/b.mp3' });
		await vi.waitFor(() => expect(instances.length).toBe(2));
		expect(first.destroy).toHaveBeenCalledTimes(1);
		expect(instances[1].opts.url).toBe('/b.mp3');
	});

	it('exposes the imperative API via the component instance', async () => {
		const result = render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		const api = result.component as unknown as {
			seekTo: (s: number) => void;
			pause: () => void;
			getInstance: () => MockPlayer | null;
		};
		api.seekTo(30);
		api.pause();
		expect(instances[0].seekTo).toHaveBeenCalledWith(30);
		expect(instances[0].pause).toHaveBeenCalledTimes(1);
		expect(api.getInstance()).toBe(instances[0]);
	});

	it('merges fall-through class + attrs with the base wfp-host class', () => {
		const { container } = render(WaveformPlayer, {
			props: { url: '/a.mp3', class: 'custom', id: 'player-1' },
		});
		const el = container.querySelector('div') as HTMLDivElement;
		expect(el.classList.contains('wfp-host')).toBe(true);
		expect(el.classList.contains('custom')).toBe(true);
		expect(el.id).toBe('player-1');
	});

	// These props type-check for free (the Props type derives from the core's
	// WaveformPlayerOptions), but options are mapped by hand — so a prop that
	// isn't destructured and `set()` type-checks and then silently does
	// nothing. That failure is invisible without these.
	it('maps buttonRadius, including 0', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3', buttonRadius: 0 } });
		await firstInstance();
		expect(instances[0].opts.buttonRadius).toBe(0);
	});

	it('maps a buttonRadius unit string', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3', buttonRadius: '0.5rem' } });
		await firstInstance();
		expect(instances[0].opts.buttonRadius).toBe('0.5rem');
	});

	it('maps artworkPosition', async () => {
		render(WaveformPlayer, {
			props: { url: '/a.mp3', artwork: '/c.jpg', artworkPosition: 'button' },
		});
		await firstInstance();
		expect(instances[0].opts.artworkPosition).toBe('button');
	});

	it('omits both when unset, so the core defaults apply', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect('buttonRadius' in instances[0].opts).toBe(false);
		expect('artworkPosition' in instances[0].opts).toBe(false);
	});

	it('maps crossOrigin when set', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3', crossOrigin: 'anonymous' } });
		await firstInstance();
		expect(instances[0].opts.crossOrigin).toBe('anonymous');
	});

	it('omits crossOrigin when unset, so the core default (native <audio>) applies', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect('crossOrigin' in instances[0].opts).toBe(false);
	});

	// Typed since core 1.18 / 1.17, but not destructured — so they fell into
	// `...rest` and were spread onto the host <div> as attributes instead of
	// reaching the player.
	it('maps waveformGradient and seekHandle (including false)', async () => {
		const { container } = render(WaveformPlayer, {
			props: { url: '/a.mp3', waveformGradient: 'horizontal', seekHandle: false },
		});
		await firstInstance();
		expect(instances[0].opts.waveformGradient).toBe('horizontal');
		expect(instances[0].opts.seekHandle).toBe(false);
		const el = container.querySelector('div.wfp-host') as HTMLDivElement;
		expect(el.hasAttribute('waveformGradient')).toBe(false);
		expect(el.hasAttribute('seekHandle')).toBe(false);
	});

	it('omits waveformGradient and seekHandle when unset, so the core defaults apply', async () => {
		render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect('waveformGradient' in instances[0].opts).toBe(false);
		expect('seekHandle' in instances[0].opts).toBe(false);
	});

	it('forwards onnexttrack / onprevioustrack as onNextTrack / onPreviousTrack', async () => {
		const onnexttrack = vi.fn();
		const onprevioustrack = vi.fn();
		render(WaveformPlayer, { props: { url: '/a.mp3', onnexttrack, onprevioustrack } });
		await firstInstance();
		const o = instances[0].opts as Record<string, (...args: unknown[]) => void>;
		o.onNextTrack(instances[0]);
		o.onPreviousTrack(instances[0]);
		expect(onnexttrack).toHaveBeenCalledWith(instances[0]);
		expect(onprevioustrack).toHaveBeenCalledWith(instances[0]);
	});

	it('omits the track-nav callbacks when unset, so no dead lock-screen buttons appear', async () => {
		// The core registers the Media Session nexttrack/previoustrack action
		// whenever the option is a function.
		render(WaveformPlayer, { props: { url: '/a.mp3' } });
		await firstInstance();
		expect('onNextTrack' in instances[0].opts).toBe(false);
		expect('onPreviousTrack' in instances[0].opts).toBe(false);
	});

	it('remounts when a track-nav handler is added, not when it is swapped', async () => {
		// Through the fine-grained Harness parent — see test/Harness.svelte for
		// why testing-library's rerender() can't tell these cases apart.
		const { component } = render(Harness, {
			props: { initial: { url: '/a.mp3', onnexttrack: vi.fn() } },
		});
		await firstInstance();

		const next2 = vi.fn();
		flushSync(() => component.update({ onnexttrack: next2 }));
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		expect(instances).toHaveLength(1);
		(instances[0].opts.onNextTrack as (i: unknown) => void)(instances[0]);
		expect(next2).toHaveBeenCalledTimes(1);

		// Presence is read at construction (that's when the core registers
		// the Media Session action), so gaining a handler must remount.
		flushSync(() => component.update({ onprevioustrack: vi.fn() }));
		await vi.waitFor(() => expect(instances.length).toBe(2));
		expect(typeof instances[1].opts.onPreviousTrack).toBe('function');
	});

	/* The core writes its own classes onto the host: createDOM() resets the
	 * whole list to `waveform-player` (+ `waveform-layout-preview`,
	 * `waveform-theme-light`), and load/error paths toggle
	 * `waveform-is-placeholder` later. A class-only change doesn't remount,
	 * so if Svelte rewrote the `class` attribute those would be gone for good.
	 * Through the Harness so only `class` is invalidated. */
	it('keeps the core-added classes when only class changes', async () => {
		MockPlayer.onConstruct = (el) => {
			el.className = 'waveform-player';
			el.classList.add('waveform-layout-preview');
		};
		const { component, container } = render(Harness, {
			props: { initial: { url: '/a.mp3', class: 'first' } },
		});
		await firstInstance();
		const el = container.querySelector('div') as HTMLDivElement;
		el.classList.add('waveform-is-placeholder'); // a later, post-construction toggle

		flushSync(() => component.update({ class: 'second' }));
		await new Promise<void>((resolve) => setTimeout(resolve, 50));

		expect(instances).toHaveLength(1); // no remount to paper over it
		expect(el.className.split(' ').sort()).toEqual(
			['second', 'waveform-is-placeholder', 'waveform-layout-preview', 'waveform-player', 'wfp-host'].sort()
		);

		flushSync(() => component.update({ class: undefined }));
		expect(el.className.split(' ').sort()).toEqual(
			['waveform-is-placeholder', 'waveform-layout-preview', 'waveform-player', 'wfp-host'].sort()
		);
	});

	it('re-applies class and wfp-host after the core resets the class list on construction', async () => {
		MockPlayer.onConstruct = (el) => {
			el.className = 'waveform-player';
		};
		const { container } = render(WaveformPlayer, { props: { url: '/a.mp3', class: 'mine' } });
		await firstInstance();
		expect((container.querySelector('div') as HTMLDivElement).className.split(' ').sort()).toEqual(
			['mine', 'waveform-player', 'wfp-host'].sort()
		);
	});

	it('treats style as inline CSS on the host, never as the core waveformStyle alias', async () => {
		const { container } = render(WaveformPlayer, {
			props: { url: '/a.mp3', style: 'min-height: 64px' },
		});
		await firstInstance();
		expect((container.querySelector('div.wfp-host') as HTMLDivElement).style.minHeight).toBe('64px');
		expect('waveformStyle' in instances[0].opts).toBe(false);
		expect('style' in instances[0].opts).toBe(false);
	});
});

describe('WaveformPlayer types (Svelte)', () => {
	it('keeps style as the CSS attribute and camelCase callbacks off the props type', () => {
		// `style` would otherwise be typed as the core's WaveformStyle alias
		// while being spread onto the <div> as CSS; the camelCase track-nav
		// callbacks would type-check and land in `...rest`.
		expectTypeOf<WaveformPlayerProps>().not.toHaveProperty('style');
		expectTypeOf<WaveformPlayerProps>().not.toHaveProperty('onNextTrack');
		expectTypeOf<WaveformPlayerProps>().not.toHaveProperty('onPreviousTrack');
		expectTypeOf<WaveformPlayerCallbacks>().toHaveProperty('onnexttrack');
		expectTypeOf<WaveformPlayerCallbacks>().toHaveProperty('onprevioustrack');
	});
});
