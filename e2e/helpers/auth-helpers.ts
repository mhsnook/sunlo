import { expect, Page, TestInfo } from '@playwright/test'

// Test user credentials and IDs from seed data
export const TEST_USER_UID = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
export const TEST_USER_EMAIL = 'sunloapp@gmail.com'
export const FIRST_USER_UID = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
export const FIRST_USER_EMAIL = 'sunloapp+1@gmail.com'
export const SECOND_USER_UID = 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5'
export const SECOND_USER_EMAIL = 'sunloapp+2@gmail.com'

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

/**
 * Log in with specific credentials
 */
export async function login(
	page: Page,
	email: string,
	password: string
): Promise<void> {
	await page.goto('/login')
	await page.fill('input[name="email"]', email)
	await page.fill('input[name="password"]', password)
	await page.click('button[type="submit"]')
	await page.waitForURL(/\/learn/)
	await expect(
		page.getByText('Which deck are we studying today?')
	).toBeVisible()
}

/**
 * Log in as the test user for the current browser project.
 * Chromium uses sunloapp@gmail.com, Firefox uses +1, WebKit uses +2.
 */
export async function loginForProject(
	page: Page,
	testInfo: TestInfo
): Promise<void> {
	const { email } = getTestUserForProject(testInfo)
	await login(page, email, 'password')
}

/**
 * Log in as the default test user (sunloapp@gmail.com)
 * @deprecated Use loginForProject() in navigation tests to avoid DB conflicts
 */
export async function loginAsTestUser(page: Page): Promise<void> {
	await login(page, TEST_USER_EMAIL, 'password')
}

export async function loginAsFirstUser(page: Page): Promise<void> {
	await login(page, 'sunloapp+1@gmail.com', 'password')
}

export async function loginAsSecondUser(page: Page): Promise<void> {
	await login(page, 'sunloapp+2@gmail.com', 'password')
}

export async function loginAsFriendUser(page: Page): Promise<void> {
	await login(page, 'sunloapp+friend@gmail.com', 'password')
}

/**
 * Log out the current user
 */
export async function logout(page: Page): Promise<void> {
	// Navigate to profile and click logout
	await page.goto('/profile')
	await page.click('button:has-text("Log out")')
	await page.waitForURL(/\/login/)
}
