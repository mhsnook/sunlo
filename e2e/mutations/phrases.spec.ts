import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'
import { getPhrase, getCardByPhraseId } from '../helpers/db-helpers'

const phraseText = 'Accha, theek hai'
const phraseTranslation = 'okay, sounds good'

test.describe('Phrase Mutations', () => {
	test('addPhraseMutation: add single phrase with translation', async ({
		page,
	}) => {
		// 1. Login
		await loginAsTestUser(page)

		// 2. Navigate to add-phrase page
		await page.goto('/learn/hin/add-phrase')

		// 3. Fill the form
		await page.fill('textarea[placeholder*="text of the phrase"]', phraseText)
		await page.fill('textarea[name="translation_text"]', phraseTranslation)

		// 4. Set translation language (it's a combobox, not a select)
		await page.click('button[role="combobox"]:has-text("Select language")')
		await page.click('text=English (eng)')

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
		const phraseLink = successSection.locator('a[href*="/learn/hin/"]').first()
		const href = await phraseLink.getAttribute('href')
		const phraseId = href?.split('/').pop()

		expect(phraseId).toBeTruthy()

		// Query the database directly to verify parsing worked
		const { data: dbPhrase, error: phraseError } = await getPhrase(phraseId!)
		expect(phraseError).toBeNull()
		expect(dbPhrase).toMatchObject({
			text: phraseText,
			lang: 'hin',
		})
		expect(dbPhrase?.translations).toHaveLength(1)
		expect(dbPhrase?.translations[0]).toMatchObject({
			text: phraseTranslation,
			lang: 'eng',
		})

		// Verify the card was created (tests CardMetaSchema parsing)
		const { data: dbCard, error: cardError } = await getCardByPhraseId(
			phraseId!
		)
		expect(cardError).toBeNull()
		expect(dbCard).toMatchObject({
			phrase_id: phraseId,
			lang: 'hin',
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

	test.skip('bulkAddMutation: add multiple phrases with translations', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement bulk add test
		await page.goto('/learn/hin/bulk-add')
		// This mutation is complex and needs special handling
	})

	test.skip('addTranslation: add translation to existing phrase', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement add translation test
		// Navigate to a phrase detail page
		// Click "Add translation" button
		// Fill and submit form
		// Verify translation appears in DB and UI
	})

	test.skip('addTagsMutation: add tags to phrase', async ({ page }) => {
		await loginAsTestUser(page)
		// TODO: Implement add tags test
		// Navigate to a phrase
		// Add tags through the UI
		// Verify tags appear in DB and UI
	})

	test.skip('sendPhraseToFriendMutation: share phrase with friend', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// TODO: Implement phrase sharing test
		// This requires having a friend in the DB
		// Navigate to phrase
		// Click share button
		// Select friend
		// Verify message sent
	})
})
