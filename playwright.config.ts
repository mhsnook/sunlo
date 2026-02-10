import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Read from default .env file
dotenv.config()

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
	testDir: './e2e',
	/* Defaults to serial to prevent cleanup race conditions in mutation tests. */
	/* Read-only test scripts (test:nav) override via CLI with --fully-parallel --workers=auto */
	fullyParallel: false,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 1 : 0,
	/* Default to single worker for mutation tests; nav scripts override via --workers=auto */
	workers: 1,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'list',

	/* Path to the global setup file. */
	globalSetup: './e2e/global-setup.ts',

	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL: 'http://localhost:5173',

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry',

		/*launchOptions: {
			// 5 milliseconds delay (enough for react to tick) between actions
			slowMo: 5,
		},*/
	},

	/* Configure projects for major browsers */
	projects: [
		/* Setup project: authenticates test users and saves storageState */
		{
			name: 'setup',
			testMatch: /auth\.setup\.ts/,
		},

		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: '.auth/user-chromium.json',
			},
			dependencies: ['setup'],
		},

		{
			name: 'firefox',
			use: {
				...devices['Desktop Firefox'],
				storageState: '.auth/user-firefox.json',
			},
			dependencies: ['setup'],
		},

		{
			name: 'webkit',
			use: {
				...devices['Desktop Safari'],
				storageState: '.auth/user-webkit.json',
			},
			dependencies: ['setup'],
		},
	],

	/* Run your local dev server before starting the tests */
	webServer: {
		command: 'pnpm dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
})
