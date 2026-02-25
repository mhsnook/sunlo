import { test, expect } from '@playwright/test'
import { TEST_USER_UID } from '../helpers/auth-helpers'
import {
	getPhrase,
	getCardByPhraseId,
	TestCleanup,
} from '../helpers/db-helpers'
import { TEST_LANG } from '../helpers/test-constants'

test.describe.serial('Bulk Add Phrases (new inline-add UI)', () => {
	let cleanup: TestCleanup

	test.beforeAll(() => {
		cleanup = new TestCleanup()
	})

	test.afterAll(async () => {
		await cleanup.cleanup(['user_card', 'phrase_translation', 'phrase'])
	})

	test('page loads with inline add bar and empty-state hint', async ({
		page,
	}) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		// Page title visible
		await expect(
			page.getByRole('heading', { name: new RegExp(`Bulk Add.*Phrases`) })
		).toBeVisible()

		// Inline add bar is present with both inputs
		const addBar = page.getByTestId('inline-add-bar')
		await expect(addBar).toBeVisible()
		await expect(addBar.getByTestId('inline-phrase-input')).toBeVisible()
		await expect(addBar.getByTestId('inline-translation-input')).toBeVisible()

		// Add button should be disabled when inputs are empty
		await expect(addBar.getByTestId('inline-add-button')).toBeDisabled()

		// Empty-state hint should be visible (no staged phrases yet)
		await expect(
			page.getByText(/Type a phrase and translation above/i)
		).toBeVisible()

		// Staged phrases list should NOT be present yet
		await expect(page.getByTestId('staged-phrases-list')).not.toBeVisible()
	})

	test('can stage a phrase via inline add bar', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Type phrase text
		await phraseInput.fill('namaste duniya')

		// Press Enter to move to translation field
		await phraseInput.press('Enter')
		await expect(translationInput).toBeFocused()

		// Type translation and press Enter to add
		await translationInput.fill('hello world')
		await translationInput.press('Enter')

		// Staged list should now appear with 1 phrase
		await expect(page.getByTestId('staged-phrases-list')).toBeVisible()
		await expect(page.getByText('1 phrase ready')).toBeVisible()
		await expect(page.getByText('namaste duniya')).toBeVisible()
		await expect(page.getByText('hello world')).toBeVisible()

		// Empty-state hint should be gone
		await expect(
			page.getByText(/Type a phrase and translation above/i)
		).not.toBeVisible()

		// Inputs should be cleared and phrase input re-focused
		await expect(phraseInput).toHaveValue('')
		await expect(translationInput).toHaveValue('')
	})

	test('can stage multiple phrases and see correct count', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Add first phrase
		await phraseInput.fill('pehla vakya')
		await phraseInput.press('Enter')
		await translationInput.fill('first sentence')
		await translationInput.press('Enter')

		await expect(page.getByText('1 phrase ready')).toBeVisible()

		// Add second phrase
		await phraseInput.fill('doosra vakya')
		await phraseInput.press('Enter')
		await translationInput.fill('second sentence')
		await translationInput.press('Enter')

		await expect(page.getByText('2 phrases ready')).toBeVisible()

		// Both phrases should be in the staging list
		const stagingList = page.getByTestId('staged-phrases-list')
		await expect(stagingList.getByText('pehla vakya')).toBeVisible()
		await expect(stagingList.getByText('doosra vakya')).toBeVisible()
	})

	test('can add phrase via Add button instead of Enter', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')
		const addButton = addBar.getByTestId('inline-add-button')

		// Button starts disabled
		await expect(addButton).toBeDisabled()

		// Fill both fields
		await phraseInput.fill('button vakya')
		await translationInput.fill('button sentence')

		// Button should now be enabled
		await expect(addButton).toBeEnabled()

		// Click Add
		await addButton.click()

		// Phrase should be staged
		await expect(page.getByText('1 phrase ready')).toBeVisible()
		await expect(page.getByText('button vakya')).toBeVisible()
	})

	test('can remove a staged phrase', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Add two phrases
		await phraseInput.fill('rakhne wala')
		await phraseInput.press('Enter')
		await translationInput.fill('keep this one')
		await translationInput.press('Enter')

		await phraseInput.fill('hatane wala')
		await phraseInput.press('Enter')
		await translationInput.fill('remove this one')
		await translationInput.press('Enter')

		await expect(page.getByText('2 phrases ready')).toBeVisible()

		// Click the remove button on the second phrase row
		const stagingList = page.getByTestId('staged-phrases-list')
		const secondRow = stagingList.locator('> div').nth(1)
		await secondRow.hover()
		await secondRow.getByLabel('Remove phrase').click()

		// Should now show 1 phrase
		await expect(page.getByText('1 phrase ready')).toBeVisible()
		await expect(page.getByText('rakhne wala')).toBeVisible()
		await expect(page.getByText('hatane wala')).not.toBeVisible()
	})

	test('clear all removes all staged phrases', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Add two phrases
		await phraseInput.fill('ek')
		await phraseInput.press('Enter')
		await translationInput.fill('one')
		await translationInput.press('Enter')

		await phraseInput.fill('do')
		await phraseInput.press('Enter')
		await translationInput.fill('two')
		await translationInput.press('Enter')

		await expect(page.getByText('2 phrases ready')).toBeVisible()

		// Click "Clear all"
		await page.getByRole('button', { name: /clear all/i }).click()

		// Staging list should be gone, empty state should return
		await expect(page.getByTestId('staged-phrases-list')).not.toBeVisible()
		await expect(
			page.getByText(/Type a phrase and translation above/i)
		).toBeVisible()
	})

	test('can edit a staged phrase via dialog', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Add a phrase
		await phraseInput.fill('galt vakya')
		await phraseInput.press('Enter')
		await translationInput.fill('wrong sentence')
		await translationInput.press('Enter')

		await expect(page.getByText('1 phrase ready')).toBeVisible()

		// Click edit on the phrase row
		const stagingList = page.getByTestId('staged-phrases-list')
		const row = stagingList.locator('> div').first()
		await row.hover()
		await row.getByLabel('Edit phrase').click()

		// Edit dialog should open
		await expect(
			page.getByRole('heading', { name: /edit phrase/i })
		).toBeVisible()

		// Modify the phrase text
		const phraseField = page.getByTestId('edit-phrase-text')
		await phraseField.clear()
		await phraseField.fill('sahi vakya')

		// Modify translation
		const translationField = page.getByTestId('edit-translation-0')
		await translationField.clear()
		await translationField.fill('correct sentence')

		// Save
		await page.getByTestId('edit-save-button').click()

		// Dialog should close and staged list should reflect edits
		await expect(
			page.getByRole('heading', { name: /edit phrase/i })
		).not.toBeVisible()
		await expect(page.getByText('sahi vakya')).toBeVisible()
		await expect(page.getByText('correct sentence')).toBeVisible()
		await expect(page.getByText('galt vakya')).not.toBeVisible()
	})

	test('Escape key clears the inline inputs', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		// Type into both fields
		await phraseInput.fill('temporary')
		await translationInput.fill('also temporary')

		// Press Escape on translation field
		await translationInput.press('Escape')

		// Both inputs should be cleared
		await expect(phraseInput).toHaveValue('')
		await expect(translationInput).toHaveValue('')
	})

	test('submit staged phrases and verify success', async ({ page }) => {
		await page.goto('/learn')
		await page.goto(`/learn/${TEST_LANG}/bulk-add`)

		const addBar = page.getByTestId('inline-add-bar')
		const phraseInput = addBar.getByTestId('inline-phrase-input')
		const translationInput = addBar.getByTestId('inline-translation-input')

		const uniqueSuffix = Math.random().toString(36).slice(2, 8)
		const phrase1Text = `test phrase alpha ${uniqueSuffix}`
		const phrase1Translation = `test translation alpha ${uniqueSuffix}`
		const phrase2Text = `test phrase beta ${uniqueSuffix}`
		const phrase2Translation = `test translation beta ${uniqueSuffix}`

		// Stage two phrases
		await phraseInput.fill(phrase1Text)
		await phraseInput.press('Enter')
		await translationInput.fill(phrase1Translation)
		await translationInput.press('Enter')

		await phraseInput.fill(phrase2Text)
		await phraseInput.press('Enter')
		await translationInput.fill(phrase2Translation)
		await translationInput.press('Enter')

		await expect(page.getByText('2 phrases ready')).toBeVisible()

		// Click submit
		await page.getByTestId('submit-staged-phrases').click()

		// Wait for success toast
		await expect(page.getByText(/2 phrases added successfully/i)).toBeVisible({
			timeout: 15000,
		})

		// Staging list should be cleared
		await expect(page.getByTestId('staged-phrases-list')).not.toBeVisible()

		// Successfully Added section should appear
		await expect(page.getByText('Successfully Added')).toBeVisible()

		// Get phrase IDs from the success section links and verify database
		const successSection = page
			.locator('h3:has-text("Successfully Added")')
			.locator('..')
		const phraseLinks = successSection.locator(
			`a[href*="/learn/${TEST_LANG}/"]`
		)
		await expect(phraseLinks).toHaveCount(2)

		const href1 = await phraseLinks.first().getAttribute('href')
		const phraseId1 = href1?.split('/').pop()
		expect(phraseId1).toBeTruthy()

		const { data: dbPhrase1, error: error1 } = await getPhrase(phraseId1!)
		expect(error1).toBeNull()
		expect(dbPhrase1).toMatchObject({ lang: TEST_LANG })
		expect(dbPhrase1?.translations).toHaveLength(1)

		// Verify card was created (user has an active deck for TEST_LANG)
		const { data: dbCard } = await getCardByPhraseId(phraseId1!, TEST_USER_UID)
		expect(dbCard).toBeTruthy()
		expect(dbCard).toMatchObject({
			phrase_id: phraseId1,
			lang: TEST_LANG,
		})
	})
})
