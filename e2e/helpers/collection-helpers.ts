import type { Page } from '@playwright/test'
import type { DailyReviewStateType } from '../../src/lib/schemas'

/**
 * Get review session from local collection
 */
export async function getReviewSessionLocal(
	page: Page,
	lang: string,
	daySession: string
): Promise<DailyReviewStateType | null> {
	return await page.evaluate(
		({ lang, daySession }) => {
			// @ts-expect-error - accessing window global
			const reviewDaysCollection = window.__reviewDaysCollection
			if (!reviewDaysCollection) {
				throw new Error('reviewDaysCollection not attached to window')
			}

			const key = `${daySession}--${lang}`
			return reviewDaysCollection.get(key) || null
		},
		{ lang, daySession }
	)
}

/**
 * Clear review session from localStorage
 */
export async function clearReviewSessionFromLocal(
	page: Page,
	lang: string,
	daySession: string
) {
	await page.evaluate(
		({ lang, daySession }) => {
			const key = `${daySession}--${lang}`
			localStorage.removeItem(key)
		},
		{ lang, daySession }
	)
}
