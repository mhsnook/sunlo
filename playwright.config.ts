import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Read from default .env file
dotenv.config()

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './e2e',
	/* Run tests in files in parallel - DISABLED to prevent cleanup race conditions */
	/* Each browser project runs fully (including afterAll cleanup) before next browser starts */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Use single worker to prevent test conflicts from parallel execution */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',

	/* Path to the global setup file. */
	globalSetup: './e2e/global-setup.ts',

	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: 'http://localhost:5173',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',

		launchOptions: {
			// 5 milliseconds delay (enough for react to tick) between actions
			slowMo: 5,
		},
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
})
