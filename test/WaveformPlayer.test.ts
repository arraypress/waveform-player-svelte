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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/svelte';

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
	constructor(el: HTMLElement, opts: Record<string, unknown>) {
		this.el = el;
		this.opts = opts;
		instances.push(this);
	}
}

vi.mock('@arraypress/waveform-player', () => ({
	default: MockPlayer,
	WaveformPlayer: MockPlayer,
}));

import WaveformPlayer from '../src/lib/WaveformPlayer.svelte';

const firstInstance = () => vi.waitFor(() => expect(instances.length).toBeGreaterThan(0));

beforeEach(() => {
	instances.length = 0;
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
});
