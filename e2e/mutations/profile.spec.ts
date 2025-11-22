import { test } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'

test.describe('Profile Mutations', () => {
	test.skip('updateProfile: update user profile', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement update profile test
		// Navigate to profile settings
		// Update username or other fields
		// Verify update in DB
	})

	test.skip('avatarUpload: upload avatar image', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement avatar upload test
		// Navigate to avatar editor
		// Upload image
		// Verify image in storage
		// Verify avatar_path in DB
	})

	test.skip('changeEmail: change user email', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement change email test
		// Navigate to email change
		// Submit new email
		// Verify confirmation sent
		// Verify email updated in auth
	})

	test.skip('changePassword: change user password', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement change password test
		// Navigate to password change
		// Submit new password
		// Verify can login with new password
	})
})
