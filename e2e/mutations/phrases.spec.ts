import { test, expect } from '@playwright/test'
import { loginAsTestUser } from '../helpers/auth-helpers'
import {
	getPhrase,
	getCardByPhraseId,
	countPhrasesByLang,
	countTranslations,
} from '../helpers/db-helpers'

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

	test('bulkAddMutation: add multiple phrases with translations', async ({
		page,
	}) => {
		await loginAsTestUser(page)
		// Define test data - weather phrase with 2 translations, food phrase with 1
		const phrase1 = {
			text: 'aaj mosam kaisa hai?',
			translations: [
				{ lang: 'eng', text: "What's the weather like today?" },
				{ lang: 'eng', text: "How's the weather today?" },
			],
		}
		const phrase2 = {
			text: 'ye khana bahut swadishth hai',
			translations: [{ lang: 'eng', text: 'This food is very delicious' }],
		}

		// 1. Get initial counts from database
		const initialPhraseCount = await countPhrasesByLang('hin')
		const initialTranslationCount = await countTranslations()

		// 2. Navigate to bulk add page
		await page.goto('/learn/hin/bulk-add')

		// 3. Fill first phrase (the form starts with one empty phrase)
		await page
			.locator('textarea[placeholder*="Enter the phrase to learn"]')
			.first()
			.fill(phrase1.text)

		// Fill first translation
		await page
			.locator('textarea[placeholder*="Translation text"]')
			.first()
			.fill(phrase1.translations[0].text)

		// Add second translation for first phrase
		await page.locator('button:has-text("Add Translation")').first().click()
		await page
			.locator('textarea[placeholder*="Translation text"]')
			.nth(1)
			.fill(phrase1.translations[1].text)

		// 4. Add second phrase
		await page.click('button:has-text("Add Another Phrase")')

		// Fill second phrase
		await page
			.locator('textarea[placeholder*="Enter the phrase to learn"]')
			.nth(1)
			.fill(phrase2.text)
		await page
			.locator('textarea[placeholder*="Translation text"]')
			.last()
			.fill(phrase2.translations[0].text)

		// Get initial collection size before submission
		const initialCollectionSize = await page.evaluate(() => {
			return window.__phrasesCollection.size
		})

		// 5. Submit the form
		await page.click('button[type="submit"]:has-text("Save All Phrases")')

		// 6. Wait for success message
		await expect(page.getByText(/2 phrases added successfully!/i)).toBeVisible()

		// 7. Verify both phrases appear in the "Successfully Added" section
		await expect(page.getByText('Successfully Added')).toBeVisible()
		await expect(page.getByText(phrase1.text)).toBeVisible()
		await expect(page.getByText(phrase2.text)).toBeVisible()

		// 8. Verify database counts increased correctly
		const finalPhraseCount = await countPhrasesByLang('hin')
		const finalTranslationCount = await countTranslations()

		expect(finalPhraseCount).toBe(initialPhraseCount + 2) // 2 new phrases
		expect(finalTranslationCount).toBe(initialTranslationCount + 3) // 3 new translations

		// 9. Verify local collection was updated correctly
		const finalCollectionSize = await page.evaluate(() => {
			return window.__phrasesCollection.size
		})

		expect(finalCollectionSize).toBe(initialCollectionSize + 2)

		// 10. Get the phrase IDs from the UI and verify their database values match
		const successSection = page
			.locator('h3:has-text("Successfully Added")')
			.locator('..')
		const phraseLinks = successSection.locator('a[href*="/learn/hin/"]')

		// Should have 2 phrase links
		await expect(phraseLinks).toHaveCount(2)
		await expect(finalCollectionSize).toBeGreaterThan(2)

		// Get both phrase IDs
		const href1 = await phraseLinks.first().getAttribute('href')
		const phraseId1 = href1?.split('/').pop()
		const href2 = await phraseLinks.nth(1).getAttribute('href')
		const phraseId2 = href2?.split('/').pop()

		expect(phraseId1).toBeTruthy()
		expect(phraseId2).toBeTruthy()

		// Verify first phrase in database
		const { data: dbPhrase1, error: error1 } = await getPhrase(phraseId1!)
		expect(error1).toBeNull()
		expect(dbPhrase1).toMatchObject({
			text: phrase1.text,
			lang: 'hin',
		})
		expect(dbPhrase1?.translations).toHaveLength(2)
		expect(dbPhrase1?.translations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					text: phrase1.translations[0].text,
					lang: 'eng',
				}),
				expect.objectContaining({
					text: phrase1.translations[1].text,
					lang: 'eng',
				}),
			])
		)

		// Verify second phrase in database
		const { data: dbPhrase2, error: error2 } = await getPhrase(phraseId2!)
		expect(error2).toBeNull()
		expect(dbPhrase2).toMatchObject({
			text: phrase2.text,
			lang: 'hin',
		})
		expect(dbPhrase2?.translations).toHaveLength(1)
		expect(dbPhrase2?.translations[0]).toMatchObject({
			text: phrase2.translations[0].text,
			lang: 'eng',
		})

		// 11. Verify local collection values match database values
		const collectionPhrase1 = await page.evaluate((id) => {
			const phrase = window.__phrasesCollection.get(id)
			return phrase ?
					{
						id: phrase.id,
						text: phrase.text,
						lang: phrase.lang,
						translations: phrase.translations,
					}
				:	null
		}, phraseId1)

		const collectionPhrase2 = await page.evaluate((id) => {
			const phrase = window.__phrasesCollection.get(id)
			return phrase ?
					{
						id: phrase.id,
						text: phrase.text,
						lang: phrase.lang,
						translations: phrase.translations,
					}
				:	null
		}, phraseId2)

		expect(collectionPhrase1).toMatchObject({
			id: phraseId1,
			text: phrase1.text,
			lang: 'hin',
		})
		expect(collectionPhrase1?.translations).toHaveLength(2)

		expect(collectionPhrase2).toMatchObject({
			id: phraseId2,
			text: phrase2.text,
			lang: 'hin',
		})
		expect(collectionPhrase2?.translations).toHaveLength(1)
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
