import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'
import { clearAllIntroStates } from '../helpers/collection-helpers'

test.describe('Onboarding and Auth Mutations', () => {
	test.skip('signupMutation: create new account', async ({ page }) => {
		// TODO: Implement signup test
		// Navigate to signup
		// Fill form and submit
		// Verify account created
		// Verify confirmation email sent
	})

	test.skip('gettingStarted: complete onboarding flow', async ({ page }) => {
		// TODO: Implement onboarding test
		// Complete signup
		// Fill getting started form (username, languages_known)
		// After profile creation, should redirect to /welcome
		// Verify welcome page shows feature explanations
		// Click through to continue to /learn or /learn/add-deck
	})

	test('communityNorms: must affirm community norms on welcome page', async ({
		page,
	}) => {
		// Login without skipping intros so we see the community norms dialog
		await loginAsTestUser(page, { skipWelcome: false, skipIntros: false })

		// Clear any existing intro states to simulate a fresh user
		await clearAllIntroStates(page)

		// Navigate to welcome page
		await page.goto('/welcome')

		// The community norms dialog should appear
		await expect(
			page.getByRole('heading', { name: 'Welcome to the Sunlo Community' })
		).toBeVisible({ timeout: 10000 })

		// Verify key content is visible
		await expect(page.getByText('Be Kind and Patient')).toBeVisible()
		await expect(page.getByText('Share Authentically')).toBeVisible()
		await expect(page.getByText('Respect Cultures')).toBeVisible()
		await expect(page.getByText('Help Build Something Good')).toBeVisible()

		// Cannot close without affirming - verify the welcome content is not accessible
		// (the dialog blocks interaction)
		const welcomeHeader = page.getByText('Welcome, GarlicFace!')
		// The header exists but is behind the modal - check the modal is blocking
		await expect(
			page.getByRole('button', { name: 'I agree to these norms' })
		).toBeVisible()

		// Click the affirm button
		await page.getByRole('button', { name: 'I agree to these norms' }).click()

		// Dialog should close and we should see the welcome content
		await expect(welcomeHeader).toBeVisible({ timeout: 5000 })
		await expect(page.getByText('What is Sunlo?')).toBeVisible()

		// Verify the community norms dialog doesn't reappear on reload
		await page.reload()
		await expect(welcomeHeader).toBeVisible({ timeout: 10000 })
		await expect(
			page.getByRole('heading', { name: 'Welcome to the Sunlo Community' })
		).not.toBeVisible()
	})

	test.skip('welcomePage: displays features and actions', async ({ page }) => {
		// TODO: Implement welcome page test
		// Use login helper with { skipWelcome: false } to stay on welcome page
		// Verify "What is Sunlo?" section is visible
		// Verify action cards are present (profile picture, create deck, find friends, help others)
		// Verify "Requests You Can Help With" shows relevant requests
		// Click primary CTA and verify navigation
	})

	test.skip('acceptInvite: accept friend invite during onboarding', async ({
		page,
	}) => {
		// TODO: Implement accept invite test
		// Navigate with invite code
		// Complete signup
		// Verify friend connection created
	})

	test.skip('useSignOut: logout user', async ({ page }) => {
		// TODO: Implement logout test
		// Login first
		// Logout
		// Verify profile cleared
		// Verify user data removed from collections
		// Verify redirect to login
	})

	test.skip('forgotPassword: password recovery flow', async ({ page }) => {
		// TODO: Implement password recovery test
		// Navigate to forgot password
		// Submit email
		// Verify recovery email sent
		// (Optional: complete recovery with test link)
	})
})
