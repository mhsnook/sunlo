import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

/**
 * CI-optimized Playwright configuration.
 *
 * Differences from the default config:
 * - Chromium only (cross-browser runs in the full suite)
 * - No slowMo
 * - 1 retry instead of 2 (catches real flakes without tripling time)
 * - Fully parallel with default worker count (nav tests are read-only)
 * - GitHub reporter for inline PR annotations
 */
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: true,
	retries: 1,
	/* Default workers (half of CPUs) — safe because nav tests don't mutate DB */
	reporter: [['html', { open: 'never' }], ['github']],

	globalSetup: './e2e/global-setup.ts',

	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: false,
	},
})
