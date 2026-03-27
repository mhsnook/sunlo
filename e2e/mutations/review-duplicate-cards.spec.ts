/**
 * Regression tests for review session creation when some user_card records
 * already exist in the database (e.g. due to stale local collection state).
 *
 * Bug: upsert without onConflict used primary key, so inserting a card whose
 * (uid, phrase_id) already existed would throw a 23505 duplicate key error
 * instead of being silently skipped.
 *
 * Fix: upsert now uses { onConflict: 'uid,phrase_id', ignoreDuplicates: true }
 * so pre-existing cards are skipped and the review session is always created.
 */
import { test, expect } from '@playwright/test'
import { cleanupReviewSession, supabase } from '../helpers/db-helpers'
import { goToDeckPage } from '../helpers/goto-helpers'
import { TEST_LANG } from '../helpers/test-constants'
import { TEST_USER_UID } from '../helpers/auth-helpers'
import { todayString } from '../../src/lib/utils'

const sessionDate = todayString()

test.describe('Review session: duplicate user_card handling', () => {
	test.beforeEach(async () => {
		await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
	})

	test.afterEach(async () => {
		await cleanupReviewSession(TEST_USER_UID, TEST_LANG, sessionDate)
	})

	test('creates review session even when all cards-to-create already exist in DB', async ({
		page,
	}) => {
		await page.goto('/learn')
		await goToDeckPage(page, TEST_LANG)
		await expect(page.getByTestId('review-setup-page')).toBeVisible()

		// Intercept the user_card upsert and return an empty array,
		// simulating that all cards-to-create already existed (ignoreDuplicates skipped them all).
		// This is the exact scenario that previously caused the bug:
		// the guard `newCards.length !== cardsToCreate.length` would set reviewDay=null
		// and throw in onSettled, preventing the review session from being created.
		let upsertIntercepted = false
		await page.route('**/rest/v1/user_card*', async (route) => {
			const request = route.request()
			if (request.method() === 'POST') {
				upsertIntercepted = true
				// Return empty array — as if all cards were already present (ignoreDuplicates)
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: '[]',
				})
			} else {
				await route.continue()
			}
		})

		await page.getByTestId('start-review-button').click()

		// Should succeed and show a toast (not an error)
		await expect(page.getByText(/Ready/i)).toBeVisible({ timeout: 10000 })

		// Should navigate to the preview page — session was created despite 0 new cards
		await page.waitForURL(new RegExp(`/learn/${TEST_LANG}/review/preview`), {
			timeout: 10000,
		})

		// Verify the review session actually exists in DB with the correct manifest
		const { data: session } = await supabase
			.from('user_deck_review_state')
			.select()
			.eq('uid', TEST_USER_UID)
			.eq('lang', TEST_LANG)
			.eq('day_session', sessionDate)
			.maybeSingle()

		expect(session).toBeTruthy()
		expect(Array.isArray(session!.manifest)).toBe(true)
		expect((session!.manifest as string[]).length).toBeGreaterThan(0)

		// Verify the upsert was actually intercepted (test is valid only if this fires)
		expect(upsertIntercepted).toBe(true)
	})

	test('toast shows "already existed" message when some cards were skipped', async ({
		page,
	}) => {
		await page.goto('/learn')
		await goToDeckPage(page, TEST_LANG)
		await expect(page.getByTestId('review-setup-page')).toBeVisible()

		// Intercept upsert — return 0 rows regardless of how many were sent
		let cardsSentToUpsert = 0
		await page.route('**/rest/v1/user_card*', async (route) => {
			const request = route.request()
			if (request.method() === 'POST') {
				const body = request.postDataJSON() as unknown[]
				cardsSentToUpsert = Array.isArray(body) ? body.length : 0
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: '[]',
				})
			} else {
				await route.continue()
			}
		})

		await page.getByTestId('start-review-button').click()

		if (cardsSentToUpsert > 0) {
			// When cards were sent but all skipped, toast should say "already existed"
			await expect(page.getByText(/already existed/i)).toBeVisible({
				timeout: 10000,
			})
		} else {
			// When no cards needed to be created, the regular success toast appears
			await expect(page.getByText(/Ready/i)).toBeVisible({ timeout: 10000 })
		}

		await page.waitForURL(new RegExp(`/learn/${TEST_LANG}/review/preview`), {
			timeout: 10000,
		})
	})
})
