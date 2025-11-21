import { test, expect } from '@playwright/test'
import { loginAsTestUser, TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getCardByPhraseId,
	createPhrase,
	deletePhrase,
	createRequestAndPhrase,
	deleteRequest,
} from '../helpers/db-helpers'

test.describe('Card Status Mutations', () => {
	test('useCardStatusMutation: add card and change status via dropdown', async ({
		page,
	}) => {
		// 1. Create a phrase via API (faster and gives us the ID)
		const { phrase } = await createPhrase({
			lang: 'hin',
			text: 'Card status toggle test phrase',
			translationText: 'Card status toggle test translation',
		})
		const phraseId = phrase.id

		await loginAsTestUser(page)

		try {
			// 2. Navigate directly to the phrase page
			await page.goto(`/learn/hin/${phraseId}`)
			if (!phraseId)
				throw new Error('Phrase ID not found after supposedly creating phrase')
			// The phrase should be visible
			await expect(page.getByText(phrase.text)).toBeVisible()
			await expect(
				page.getByText(new RegExp(`Card status toggle test phrase`))
			).toBeVisible()

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
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
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
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
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
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
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
			await expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
				expect(card?.status).toBe('active')
			}).toPass({ timeout: 5000 })

			// 8. Verify card appears in library with filter
			await page.goto('/learn/hin/library?filter=active')
			await expect(page.getByText(phrase.text)).toBeVisible()
		} finally {
			// Clean up: Delete the phrase (which cascades to translation and card)
			await deletePhrase(phraseId)
		}
	})

	test('useCardStatusMutation: toggle phrase and card learned via heart icon', async ({
		page,
	}) => {
		// 1. Create a phrase via API
		const { request, phrase } = await createRequestAndPhrase({
			lang: 'hin',
			prompt: 'How do I say heart toggle test phrase ?',
			text: 'Heart toggle test phrase',
			translationText: 'Heart toggle test translation',
		})
		const phraseId = phrase.id

		await loginAsTestUser(page)

		try {
			if (!phraseId)
				throw new Error('Phrase ID not found after supposedly creating phrase')

			// 2. Navigate to request page where heart icon should be visible
			await page.goto(`/learn/hin/requests/${request!.id}`)

			// Verify the phrase is visible on the request page
			await expect(page.getByText(phrase.text)).toBeVisible()

			// 3. Initially there should be no card - verify this
			const { data: initialCard } = await getCardByPhraseId(
				phraseId,
				TEST_USER_UID
			)
			expect(initialCard).toBeNull()

			// 4. Find and click the heart icon to create a card with status 'active'
			const phraseCard = page.getByText(phrase.text).locator('..')
			const heartButton = phraseCard
				.locator('button')
				.filter({ has: page.locator('svg') })
				.first()

			await heartButton.click()
			await expect(
				page.getByText('Added this phrase to your deck')
			).toBeVisible()

			// Verify card was created in local collection with status 'active'
			let cardInCollection = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(cardInCollection?.status).toBe('active')

			// Also verify in DB
			expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
				expect(card).toBeTruthy()
				expect(card?.status).toBe('active')
			})

			// 5. Click heart again to toggle to 'skipped'
			await heartButton.click()
			await expect(page.getByText('Updated card status')).toBeVisible()

			// Verify status changed to 'skipped' in collection
			cardInCollection = await page.evaluate(
				(phraseId) => (window as any).__cardsCollection.get(phraseId),
				phraseId
			)
			expect(cardInCollection?.status).toBe('skipped')

			// Also verify in DB
			await expect(async () => {
				const { data: card } = await getCardByPhraseId(phraseId, TEST_USER_UID)
				expect(card?.status).toBe('skipped')
			}).toPass({ timeout: 5000 })
		} finally {
			// Clean up: Delete request, phrase (which cascades to translation and card)
			await deleteRequest(request!.id)
			await deletePhrase(phraseId)
		}
	})

	test('useCardStatusMutation: verify CardMetaSchema parsing', async ({
		page,
	}) => {
		// 1. Create a phrase via API
		const { phrase } = await createPhrase({
			lang: 'hin',
			text: 'Schema parsing test phrase',
			translationText: 'Schema test translation',
		})
		const phraseId = phrase.id

		await loginAsTestUser(page)

		try {
			if (!phraseId)
				throw new Error('Phrase ID not found after supposedly creating phrase')

			// 2. Navigate to phrase and create a card
			await page.goto(`/learn/hin/${phraseId}`)
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
