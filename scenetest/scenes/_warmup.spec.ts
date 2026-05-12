// Pre-compile the Vite dev server's module graph before the first real spec
// runs. The alphabetically-first scene was timing out its initial `openTo`
// because Vite transforms modules on demand on the first request, and the
// markdown DSL has no per-step timeout escape hatch — every action shares
// the 5s actionTimeout. Doing the warmup in TS lets us pass a generous
// timeout directly to page.goto / page.waitForSelector.

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
