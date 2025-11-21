import { Page } from '@playwright/test'

// Test user credentials and IDs from seed data
export const TEST_USER_UID = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
export const TEST_USER_EMAIL = 'sunloapp@gmail.com'

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
}

/**
 * Log in as the default test user (sunloapp@gmail.com)
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
