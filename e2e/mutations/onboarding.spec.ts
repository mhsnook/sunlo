import { test } from '@playwright/test'

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
