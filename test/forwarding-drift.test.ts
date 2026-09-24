/// <reference types="node" />
/**
 * test/forwarding-drift.test.ts
 * -----------------------------
 *
 * Guards the one contract types can't: that every option the installed core
 * accepts actually reaches `new WaveformPlayer(el, opts)`, and that changing
 * it remounts the player.
 *
 * `WaveformPlayerProps` derives from the core's `WaveformPlayerOptions`, so a
 * new core option type-checks here for free — and then, unless it's added to
 * the `$props()` destructure, falls into `...rest` and is spread onto the host
 * `<div>` as an attribute instead of reaching the player. This suite
 * enumerates the core's real option surface (see `core-options.ts`) and fails
 * for any key that is neither forwarded nor listed in `NOT_FORWARDED` with a
 * reason. Adding a core option without wiring it here must fail this test.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { cleanup, render } from '@testing-library/svelte';
import { isCallbackKey, loadCoreOptionKeys, loadCoreThemes, sampleValues } from './core-options';

/**
 * Core options this wrapper deliberately does NOT forward, each with why.
 * Everything else the core accepts must reach the constructor.
 */
const NOT_FORWARDED: Record<string, string> = {
	// Svelte's inline-CSS attribute, spread onto the host <div>. The core's
	// `style` is only a shorthand alias for `waveformStyle`, which is forwarded
	// under its canonical name.
	style: 'CSS attribute on the host div; use waveformStyle for the visual style',
};

/**
 * Core keys accepted under a different PROP name. Callbacks follow Svelte's
 * lowercase event-attribute convention (`onclick`, `oninput`, …).
 */
const PROP_NAME: Record<string, string> = {
	onLoad: 'onload',
	onPlay: 'onplay',
	onPause: 'onpause',
	onEnd: 'onend',
	onTimeUpdate: 'ontimeupdate',
	onError: 'onerror',
	onNextTrack: 'onnexttrack',
	onPreviousTrack: 'onprevioustrack',
};

/** Core keys forwarded under a different OPTION name. */
const FORWARDED_AS: Record<string, string> = {
	// `src` is the core's shorthand for `url`; the wrapper resolves it to `url`.
	src: 'url',
};

const instances: Array<{ opts: Record<string, unknown>; destroy: () => void }> = [];

class MockPlayer {
	opts: Record<string, unknown>;
	destroy = vi.fn();
	constructor(_el: HTMLElement, opts: Record<string, unknown>) {
		this.opts = opts;
		instances.push(this);
	}
}

vi.mock('@arraypress/waveform-player', () => {
	throw new Error('[test] component imported the scanning entry point');
});

vi.mock('@arraypress/waveform-player/no-autoinit', () => ({
	default: MockPlayer,
	WaveformPlayer: MockPlayer,
}));

import WaveformPlayer from '../src/lib/WaveformPlayer.svelte';
import Harness from './Harness.svelte';

beforeEach(() => {
	cleanup();
	instances.length = 0;
});

/** Props that set `key` to `value`, plus a url unless `key` is the url alias. */
function propsFor(key: string, value: unknown): Record<string, unknown> {
	const prop = PROP_NAME[key] ?? key;
	return key === 'src' || key === 'url' ? { [prop]: value } : { url: '/a.mp3', [prop]: value };
}

async function mounted(count: number): Promise<boolean> {
	try {
		await vi.waitFor(() => expect(instances.length).toBeGreaterThanOrEqual(count), { timeout: 500 });
		return true;
	} catch {
		return false;
	}
}

describe('WaveformPlayer (Svelte) — forwarding drift vs the installed core', () => {
	it('forwards every core option, or lists it in NOT_FORWARDED with a reason', async () => {
		const { keys, defaults } = await loadCoreOptionKeys();
		const dropped: string[] = [];

		for (const key of keys) {
			if (key in NOT_FORWARDED) continue;
			cleanup();
			instances.length = 0;

			if (isCallbackKey(key)) {
				const handler = vi.fn();
				render(WaveformPlayer, { props: propsFor(key, handler) });
				if (!(await mounted(1))) throw new Error(`no mount for ${key}`);
				const cb = instances[0].opts[key];
				if (typeof cb !== 'function') {
					dropped.push(key);
					continue;
				}
				(cb as (...a: unknown[]) => void)(instances[0]);
				if (handler.mock.calls.length !== 1) dropped.push(`${key} (wrapper does not reach the handler)`);
				continue;
			}

			const [value] = sampleValues(key, defaults[key]);
			render(WaveformPlayer, { props: propsFor(key, value) });
			if (!(await mounted(1))) throw new Error(`no mount for ${key}`);
			const got = instances[0].opts[FORWARDED_AS[key] ?? key];
			if (JSON.stringify(got) !== JSON.stringify(value)) dropped.push(key);
		}

		expect(dropped, 'core options not destructured/forwarded by the component').toEqual([]);
	}, 60_000);

	it('remounts when any forwarded value option changes', async () => {
		const { keys, defaults } = await loadCoreOptionKeys();
		const stale: string[] = [];

		for (const key of keys) {
			// Callbacks are read through reactive closures and must NOT
			// remount on identity change — covered in the main suite.
			if (key in NOT_FORWARDED || isCallbackKey(key)) continue;
			cleanup();
			instances.length = 0;

			// Through the fine-grained Harness parent: testing-library's
			// rerender() invalidates every prop at once, so it would remount
			// even for a prop the component never reads.
			const [a, b] = sampleValues(key, defaults[key]);
			const { component } = render(Harness, { props: { initial: propsFor(key, a) } });
			if (!(await mounted(1))) throw new Error(`no mount for ${key}`);
			flushSync(() => component.update({ [PROP_NAME[key] ?? key]: b }));
			if (!(await mounted(2))) stale.push(key);
		}

		expect(stale, 'forwarded options that do not remount the player on change').toEqual([]);
	}, 60_000);

	it('the Harness only remounts for props the component reads (so the test above means something)', async () => {
		const { component } = render(Harness, { props: { initial: { url: '/a.mp3' } } });
		if (!(await mounted(1))) throw new Error('no mount');
		flushSync(() => component.update({ id: 'host-id', 'data-x': '1' }));
		await new Promise<void>((resolve) => setTimeout(resolve, 50));
		expect(instances).toHaveLength(1);
	});

	it('NOT_FORWARDED / PROP_NAME / FORWARDED_AS only name keys the core actually has', async () => {
		const { keys } = await loadCoreOptionKeys();
		const unknown = [
			...Object.keys(NOT_FORWARDED),
			...Object.keys(PROP_NAME),
			...Object.keys(FORWARDED_AS),
		].filter((k) => !keys.includes(k));
		expect(unknown, 'stale entries — the core no longer has these options').toEqual([]);
	});
});

describe('WaveformPlayerExpose docs vs the installed core', () => {
	it('documents the setPlaybackRate range the core actually clamps to', async () => {
		const { PLAYBACK_RATE_MIN, PLAYBACK_RATE_MAX } = await loadCoreThemes();
		const src = readFileSync(
			fileURLToPath(import.meta.url).replace(/test\/[^/]+$/, 'src/lib/types.ts'),
			'utf8'
		);
		const doc = /Set playback rate \(([\d.]+)\.\.([\d.]+)\b/.exec(src);
		expect(doc, 'setPlaybackRate doc comment with a range').not.toBeNull();
		expect([Number(doc![1]), Number(doc![2])]).toEqual([PLAYBACK_RATE_MIN, PLAYBACK_RATE_MAX]);
	});
});
