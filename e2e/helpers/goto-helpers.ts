import { expect, Page } from '@playwright/test'
import languages from '../../src/lib/languages'

/**
 * Navigate to /learn by visiting the base URL and waiting for the decks grid.
 * This is the one place where page.goto is acceptable (initial page load).
 */
export async function goToLearnPage(page: Page) {
	await page.goto('/learn')
	await expect(page.getByTestId('decks-list-grid')).toBeVisible({
		timeout: 10000,
	})
}

export async function goToDeckPage(page, lang: string) {
	// Navigate to the deck page for the given language
	await expect(
		page.getByTestId('decks-list-grid').getByText(languages[lang])
	).toBeVisible()
	await page.getByTestId('decks-list-grid').getByText(languages[lang]).click()

	// Should be on the deck feed page now
	await expect(page).toHaveURL(`/learn/${lang}/feed`)

	// Click Review link in the navigation
	await page
		.locator('nav[data-slot=navigation-menu]')
		.getByRole('link', { name: /review/i })
		.click()

	// Should be on review index page
	await expect(page).toHaveURL(`/learn/${lang}/review`)
}
