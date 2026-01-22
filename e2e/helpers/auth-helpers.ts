import { expect, Page, TestInfo } from '@playwright/test'
import { markAllIntrosAffirmed } from './collection-helpers'

// Test user credentials and IDs from seed data
export const TEST_USER_UID = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
export const TEST_USER_EMAIL = 'sunloapp@gmail.com'
export const FIRST_USER_UID = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
export const FIRST_USER_EMAIL = 'sunloapp+1@gmail.com'
export const SECOND_USER_UID = 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5'
export const SECOND_USER_EMAIL = 'sunloapp+2@gmail.com'
// New user without profile - for testing welcome page / onboarding flow
export const NEW_USER_UID = 'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8'
export const NEW_USER_EMAIL = 'sunloapp+new@gmail.com'

// Map browser projects to different test users to avoid DB conflicts
const browserUserMap: Record<
	string,
	{ email: string; uid: string; username: string }
> = {
	chromium: {
		email: TEST_USER_EMAIL,
		uid: TEST_USER_UID,
		username: 'GarlicFace',
	},
	firefox: {
		email: FIRST_USER_EMAIL,
		uid: FIRST_USER_UID,
		username: 'Best Frin',
	},
	webkit: {
		email: SECOND_USER_EMAIL,
		uid: SECOND_USER_UID,
		username: 'Work Andy',
	},
}

/**
 * Get the test user credentials for the current browser project.
 * Each browser uses a different user to avoid DB conflicts in parallel tests.
 */
export function getTestUserForProject(testInfo: TestInfo): {
	email: string
	uid: string
	username: string
} {
	const projectName = testInfo.project.name
	return browserUserMap[projectName] ?? browserUserMap.chromium
}

export type LoginOptions = {
	/** If true (default), automatically dismiss the welcome page if shown */
	skipWelcome?: boolean
	/** If true (default), pre-affirm all intro dialogs to prevent them blocking tests */
	skipIntros?: boolean
}

/**
 * Log in with specific credentials.
 * Handles three possible post-login destinations:
 * - /learn (existing user with profile and decks)
 * - /welcome (user who just created profile)
 * - /getting-started (user without profile - needs to create one first)
 */
export async function login(
	page: Page,
	email: string,
	password: string,
	options: LoginOptions = {}
): Promise<void> {
	const { skipWelcome = true, skipIntros = true } = options

	await page.goto('/login')

	// Pre-affirm all intro dialogs to prevent them from blocking tests
	if (skipIntros) {
		await markAllIntrosAffirmed(page)
	}

	await page.fill('input[name="email"]', email)
	await page.fill('input[name="password"]', password)
	await page.click('button[type="submit"]')

	// Wait for redirect to complete
	await page.waitForLoadState('networkidle')

	// If user has no profile, they need to complete getting-started first
	// This is expected for new users - the test should handle profile creation
	if (page.url().includes('/getting-started')) {
		// Don't proceed further - let the test handle profile creation
		return
	}

	// If we landed on welcome page and skipWelcome is true, navigate to /learn
	if (skipWelcome && !page.url().match(/\/learn$/)) {
		const goToDecksButton = page.getByRole('link', { name: 'Go to My Decks' })
		await expect(goToDecksButton).toBeVisible({ timeout: 10000 })
		await goToDecksButton.click()
		await expect(page).toHaveURL(/\/learn$/, { timeout: 10000 })
	}

	// For users landing on /learn, verify the expected content
	if (page.url().includes('/learn')) {
		await expect(
			page.getByText('Which deck are we studying today?')
		).toBeVisible()
	}
}

/**
 * Log in as the test user for the current browser project.
 * Chromium uses sunloapp@gmail.com, Firefox uses +1, WebKit uses +2.
 */
export async function loginForProject(
	page: Page,
	testInfo: TestInfo,
	options: LoginOptions = {}
): Promise<void> {
	const { email } = getTestUserForProject(testInfo)
	await login(page, email, 'password', options)
}

/**
 * Log in as the default test user (sunloapp@gmail.com)
 * @deprecated Use loginForProject() in navigation tests to avoid DB conflicts
 */
export async function loginAsTestUser(
	page: Page,
	options: LoginOptions = {}
): Promise<void> {
	await login(page, TEST_USER_EMAIL, 'password', options)
}

export async function loginAsFirstUser(
	page: Page,
	options: LoginOptions = {}
): Promise<void> {
	await login(page, 'sunloapp+1@gmail.com', 'password', options)
}

export async function loginAsSecondUser(
	page: Page,
	options: LoginOptions = {}
): Promise<void> {
	await login(page, 'sunloapp+2@gmail.com', 'password', options)
}

export async function loginAsFriendUser(
	page: Page,
	options: LoginOptions = {}
): Promise<void> {
	await login(page, 'sunloapp+friend@gmail.com', 'password', options)
}

/**
 * Log in as the new user who has no profile yet.
 * This user will be redirected to /getting-started to create a profile,
 * then to /welcome after profile creation.
 * Use { skipWelcome: false } to stay on the welcome page for testing.
 */
export async function loginAsNewUser(
	page: Page,
	options: LoginOptions = {}
): Promise<void> {
	await login(page, NEW_USER_EMAIL, 'password', options)
}

/**
 * Log out the current user
 */
export async function logout(page: Page): Promise<void> {
	// open the user nav and click logout
	await page.getByTestId('sidebar-user-menu-trigger').click()
	await page.getByTestId('sidebar-signout-button').click()
	await page.waitForURL('/')
}
