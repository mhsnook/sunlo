import { expect } from '@playwright/test'
import languages from '../../src/lib/languages'

export async function goToDeckPage(page, lang: string) {
	// Navigate to Hindi deck page
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
