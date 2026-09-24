<!--
  test/Harness.svelte
  -------------------

  A parent that passes props to <WaveformPlayer> the way a real Svelte app
  does: each prop is its own fine-grained signal (a `$state` object spread
  into the child), so updating one prop — or re-setting it to the same value —
  invalidates only that prop.

  `@testing-library/svelte`'s own `rerender()` can't show this: it swaps one
  `$state.raw` object holding ALL props, so every prop read is invalidated on
  every rerender and the player remounts even when nothing changed. Tests that
  assert "this change must NOT remount" (or that a prop is a remount trigger
  at all) go through `update()` here instead.
-->
<script lang="ts">
	import WaveformPlayer from '../src/lib/WaveformPlayer.svelte';

	let { initial }: { initial: Record<string, unknown> } = $props();

	// Seeded once from `initial` on purpose; `update()` drives it afterwards.
	// svelte-ignore state_referenced_locally
	const childProps: Record<string, unknown> = $state({ ...initial });

	/** Set (or add) props on the child. Keys not given are left untouched. */
	export function update(next: Record<string, unknown>): void {
		for (const [key, value] of Object.entries(next)) childProps[key] = value;
	}
</script>

<WaveformPlayer {...childProps} />
