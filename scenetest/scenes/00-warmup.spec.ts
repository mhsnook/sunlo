// Pre-compile the Vite dev server's module graph before the first real spec
// runs. Without this, whichever spec runs first was timing out its initial
// `openTo` because Vite transforms modules on demand on the first request,
// and the markdown DSL has no per-step timeout escape hatch — every action
// shares the 5s actionTimeout. Doing the warmup in TS lets us pass a
// generous timeout directly to page.goto / page.waitForSelector.
//
// The `00-` prefix is load-bearing: scenetest discovers spec files with a
// glob then sorts the absolute paths with default `Array.prototype.sort()`
// (UTF-16 codepoint order). Digits (0x30-0x39) sort before letters and
// underscore, so `00-warmup.spec.ts` is guaranteed to run before any
// `<letter>*.spec.{md,ts}` file in this directory.

import { test } from '@scenetest/scenes'

test('warm up dev server', async ({ actor }) => {
	const visitor = await actor('visitor')

	await visitor.do(async (page) => {
		await page.goto('http://localhost:5173/', {
			timeout: 60_000,
			waitUntil: 'load',
		})
		await page.waitForSelector('[data-testid="landing-page"]', {
			timeout: 60_000,
		})
	})
})
