/**
 * vitest.config.ts
 * ----------------
 *
 * Vitest configuration for the Svelte wrapper. The Svelte Vite plugin
 * compiles the `.svelte` component under test; `jsdom` provides the
 * DOM. The actual `@arraypress/waveform-player` library is mocked at
 * the module boundary (it relies on Web Audio + Canvas + Fetch which
 * jsdom does not implement), so the tests verify the wrapper's own
 * responsibilities without a real audio runtime.
 */
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'jsdom',
		globals: false,
		setupFiles: ['./test/setup.ts'],
	},
	resolve: {
		conditions: ['browser'],
	},
});
