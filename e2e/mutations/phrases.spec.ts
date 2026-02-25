import { test, expect } from '@playwright/test'
import { TEST_USER_UID } from '../helpers/auth-helpers'
import { getPhrase, getCardByPhraseId } from '../helpers/db-helpers'
import { TEST_LANG } from '../helpers/test-constants'

const phraseText = 'Accha, theek hai'
const phraseTranslation = 'okay, sounds good'

test.describe.serial('Phrase Mutations', () => {
	test('addPhraseMutation: add single phrase with translation', async ({
		page,
	}) => {
		// 1. Login
		await page.goto('/learn')

		// Navigate to the add phrase page
		await page.goto(`/learn/${TEST_LANG}/phrases/new`)

		// 3. Fill the form
		await page.fill('textarea[placeholder*="text of the phrase"]', phraseText)
		await page.fill('textarea[name="translation_text"]', phraseTranslation)

		// 4. Translation language defaults to English from user profile, no action needed

		// 5. Submit the form
		await page.click('button[type="submit"]:has-text("Save and add another")')

		// 6. Wait for success message
		await expect(page.getByText(/added to the public library/i)).toBeVisible()

		// 7. Verify the phrase appears in the "Successfully Added" section
		await expect(page.getByText('Successfully Added')).toBeVisible()
		await expect(page.getByText(phraseText)).toBeVisible()

		// 8. Verify database state - get the phrase ID from the UI
		// Find the "Successfully Added" section and then get the first card link within it
		const successSection = page
			.locator('h3:has-text("Successfully Added")')
			.locator('..')
		const phraseLink = successSection
			.locator(`a[href*="/learn/${TEST_LANG}/"]`)
			.first()
		const href = await phraseLink.getAttribute('href')
		const phraseId = href?.split('/').pop()

		expect(phraseId).toBeTruthy()

		// Query the database directly to verify parsing worked
		const { data: dbPhrase, error: phraseError } = await getPhrase(phraseId!)
		expect(phraseError).toBeNull()
		expect(dbPhrase).toMatchObject({
			text: phraseText,
			lang: TEST_LANG,
		})
		expect(dbPhrase?.translations).toHaveLength(1)
		expect(dbPhrase?.translations[0]).toMatchObject({
			text: phraseTranslation,
			lang: 'eng',
		})

		// Verify the card was created (tests CardMetaSchema parsing)
		const { data: dbCard, error: cardError } = await getCardByPhraseId(
			phraseId!,
			TEST_USER_UID
		)
		expect(cardError).toBeNull()
		expect(dbCard).toMatchObject({
			phrase_id: phraseId,
			lang: TEST_LANG,
		})

		// 9. Test that form was reset
		const phraseTextarea = page.locator(
			'textarea[placeholder*="text of the phrase"]'
		)
		await expect(phraseTextarea).toHaveValue('')
		const translationTextarea = page.locator(
			'textarea[name="translation_text"]'
		)
		await expect(translationTextarea).toHaveValue('')
	})

	// Bulk add UI was redesigned — tests moved to bulk-add.spec.ts
	test.skip('bulkAddMutation: replaced by bulk-add.spec.ts', async () => {})

	test.skip('addTranslation: add translation to existing phrase', async ({
		page,
	}) => {
		await page.goto('/learn')
		// TODO: Implement add translation test
		// Navigate to a phrase detail page
		// Click "Add translation" button
		// Fill and submit form
		// Verify translation appears in DB and UI
	})

	test.skip('addTagsMutation: add tags to phrase', async ({ page }) => {
		await page.goto('/learn')
		// TODO: Implement add tags test
		// Navigate to a phrase
		// Add tags through the UI
		// Verify tags appear in DB and UI
	})

	test.skip('sendPhraseToFriendMutation: share phrase with friend', async ({
		page,
	}) => {
		await page.goto('/learn')
		// TODO: Implement phrase sharing test
		// This requires having a friend in the DB
		// Navigate to phrase
		// Click share button
		// Select friend
		// Verify message sent
	})
})
