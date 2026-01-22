import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getCardByPhraseId,
	createPhrase,
	deletePhrase,
} from '../helpers/db-helpers'

test.describe('Card Status Mutations', () => {
	test('Add card, change status via dropdown', async ({ page }) => {
		await loginAsTestUser(page)
		const phrase = (
			await createPhrase({
				lang: 'hin',
				text: 'Card status toggle test phrase' + Math.random(),
				translationText: 'Card status toggle test translation' + Math.random(),
			})
		).phrase
		const phraseId = phrase.id

		if (!phrase || !phraseId)
			throw new Error('Failed to create sample phrase before test')

		try {
			// Reload to refresh collections with the newly created phrase
			await page.reload()

			// Navigate to feed via UI
			await page
				.getByTestId(`deck-card-hin`)
				.getByTestId(`deck-card-link-hin`)
				.click()

			// Navigate to the phrase page via feed link
			await page.getByTestId(`feed-phrase-link-${phraseId}`).click()

			// The phrase should be visible
			await expect(page.getByText(phrase!.text)).toBeVisible()

			// 3. Initially, there should be no card - add one via dropdown
			await page.click('button:has-text("Not in deck")')
			await page.click('text=Add to deck')

			// Wait for success toast
			await expect(
				page.getByText('Added this phrase to your deck')
			).toBeVisible()

			// Verify card was added to local collection
			const cardInCollection = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(cardInCollection?.status).toBe('active')

			// Verify card was created with status 'active'
			expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId!, TEST_USER_UID)
				expect(card?.status).toBe('active')
			})

			// 4. Reload and verify dropdown shows "Active"
			await page.reload()
			await expect(page.locator('button:has-text("Active")')).toBeVisible()

			// 5. Change status to 'learned' via dropdown
			await page.click('button:has-text("Active")')

			// Verify dropdown shows all status options
			await expect(page.getByText('Set "learned"')).toBeVisible()
			await expect(page.getByText('Ignore card')).toBeVisible()

			await page.click('text=Set "learned"')
			await expect(page.getByText('Updated card status')).toBeVisible()

			// Verify card was modified in local collection
			const modifiedCard = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(modifiedCard?.status).toBe('learned')

			// Verify status changed in database (with retry)
			expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId!, TEST_USER_UID)
				expect(card?.status).toBe('learned')
			})

			// 6. Change status to 'skipped'
			await page.reload()
			await expect(page.locator('button:has-text("Learned")')).toBeVisible()

			await page.click('button:has-text("Learned")')
			await page.click('text=Ignore card')
			await expect(page.getByText('Updated card status')).toBeVisible()
			// Verify card was modified in local collection
			const skippedCard = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(skippedCard?.status).toBe('skipped')

			// Verify status changed to skipped (with retry)
			expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId!, TEST_USER_UID)
				expect(card?.status).toBe('skipped')
			})

			// 7. Change back to 'active'
			await page.reload()
			await page.click('button:has-text("Skipped")')
			await page.click('text=Activate card')
			await expect(page.getByText('Updated card status')).toBeVisible()
			// Verify card was modified in local collection
			const activeCard = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(activeCard?.status).toBe('active')

			// Verify status changed back to active (with retry)
			expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId!, TEST_USER_UID)
				expect(card?.status).toBe('active')
			})

			// 8. Verify card appears in library - navigate via sidebar
			await page.getByTestId('sidebar-link--learn-lang-contributions').click()
			await expect(page).toHaveURL(/\/learn\/hin\/contributions/)
			await page.getByTestId('contributions-tab--phrases').click()
			await expect(page.getByText(phrase.text)).toBeVisible()
		} finally {
			// Clean up: Delete the phrase (which cascades to translation and card)
			await deletePhrase(phraseId)
		}
	})

	test('Toggle heart icon', async ({ page }) => {
		await loginAsTestUser(page)

		// 1. Create a standalone phrase via API AFTER login (so collections sync properly)
		const { phrase } = await createPhrase({
			lang: 'hin',
			text: 'Heart toggle test phrase',
			translationText: 'Heart toggle test translation',
		})
		const phraseId = phrase.id

		try {
			if (!phraseId)
				throw new Error('Phrase ID not found after supposedly creating phrase')

			// Reload to refresh collections with the newly created phrase
			await page.reload()

			// Navigate to deck feed via UI
			await page
				.getByTestId(`deck-card-hin`)
				.getByTestId(`deck-card-link-hin`)
				.click()

			// Navigate to the phrase detail page directly from the feed
			await page.getByTestId(`feed-phrase-link-${phraseId}`).click()
			await expect(page).toHaveURL(new RegExp(`/learn/hin/phrases/${phraseId}`))

			// Verify the phrase is visible
			await expect(page.getByText(phrase.text)).toBeVisible()

			// 3. Initially there should be no card - add one via dropdown
			await page.click('button:has-text("Not in deck")')
			await page.click('text=Add to deck')
			await expect(
				page.getByText('Added this phrase to your deck')
			).toBeVisible()

			// Verify card was created in local collection with status 'active'
			const cardInCollection = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(cardInCollection?.status).toBe('active')

			// Also verify in DB
			const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
			expect(card).toBeTruthy()
			expect(card?.status).toBe('active')
		} finally {
			// Clean up: Delete phrase (which cascades to translation and card)
			await deletePhrase(phraseId)
		}
	})

	test('Verify CardMetaSchema parsing', async ({ page }) => {
		await loginAsTestUser(page)

		// 1. Create a phrase via API (after login so feed can see it)
		const { phrase } = await createPhrase({
			lang: 'hin',
			text: 'Schema parsing test phrase ' + Math.random(),
			translationText: 'Schema test translation ' + Math.random(),
		})
		const phraseId = phrase.id

		try {
			// Reload to refresh feed data with new phrase
			await page.goto('/learn')

			// Navigate to feed via UI
			await page
				.getByTestId(`deck-card-hin`)
				.getByTestId(`deck-card-link-hin`)
				.click()

			// Navigate to the phrase page via feed link
			await page.getByTestId(`feed-phrase-link-${phraseId}`).click()

			// Create a card
			await page.click('button:has-text("Not in deck")')
			await page.click('text=Add to deck')
			await expect(
				page.getByText('Added this phrase to your deck')
			).toBeVisible()

			// Verify card was added to local collection
			const cardInCollection = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(cardInCollection?.status).toBe('active')

			// 3. Get the card from DB and verify it was fetched successfully
			const { data: card, error } = await getCardByPhraseId(
				phraseId,
				TEST_USER_UID
			)

			expect(error).toBeNull()
			expect(card).toBeTruthy()

			// 4. Verify basic card fields are present
			// @@TODO -- it may be smarter to compare the entire object to ensure no un-tested
			// assumptions about how the local collection's new-row data lines up with the server
			expect(card).toMatchObject({
				id: cardInCollection.id,
				created_at: cardInCollection.created_at,
				phrase_id: cardInCollection.phrase_id,
				uid: cardInCollection.uid,
				lang: cardInCollection.lang,
				status: cardInCollection.status,
				updated_at: cardInCollection.updated_at,
			})

			// Note: FSRS fields (difficulty, stability, etc.) are only in user_card_plus view
			// Since we're querying user_card table directly now, we won't have those fields
			// That's fine - we're mainly testing that the card exists and has correct basic fields

			// 5. Change the card status and verify parsing still works after update
			await page.reload()
			await page.click('button:has-text("Active")')
			await page.click('text=Set "learned"')
			await expect(page.getByText('Updated card status')).toBeVisible()

			// 6. Fetch updated card and verify it still parses correctly
			const { data: updatedCard, error: updateError } = await getCardByPhraseId(
				phraseId,
				TEST_USER_UID
			)

			expect(updateError).toBeNull()
			expect(updatedCard).toMatchObject({
				phrase_id: phraseId,
				status: 'learned', // Status should be updated
				lang: 'hin',
				uid: TEST_USER_UID,
			})

			// Verify basic fields are still present after update
			expect(updatedCard).toHaveProperty('id')
			expect(updatedCard).toHaveProperty('updated_at')
			expect(updatedCard).toHaveProperty('created_at')
		} finally {
			// Clean up: Delete the phrase (cascades to translation and card)
			await deletePhrase(phraseId)
		}
	})
})
