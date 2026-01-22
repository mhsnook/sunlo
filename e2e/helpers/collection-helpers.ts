import type { Page } from '@playwright/test'
import type { DailyReviewStateType } from '../../src/lib/schemas'

// Intro keys that need to be pre-affirmed for tests
const INTRO_KEYS = ['deck-new', 'review', 'deck-settings', 'community-norms']
const INTRO_STORAGE_PREFIX = 'sunlo-intro-'

/**
 * Mark all intro dialogs as affirmed in localStorage.
 * Call this before login to prevent intro dialogs from blocking tests.
 */
export async function markAllIntrosAffirmed(page: Page): Promise<void> {
	await page.evaluate(
		({ keys, prefix }) => {
			keys.forEach((key) => {
				localStorage.setItem(`${prefix}${key}`, 'affirmed')
			})
		},
		{ keys: INTRO_KEYS, prefix: INTRO_STORAGE_PREFIX }
	)
}

/**
 * Clear all intro states from localStorage.
 * Useful for testing the intro flow itself.
 */
export async function clearAllIntroStates(page: Page): Promise<void> {
	await page.evaluate(
		({ keys, prefix }) => {
			keys.forEach((key) => {
				localStorage.removeItem(`${prefix}${key}`)
			})
		},
		{ keys: INTRO_KEYS, prefix: INTRO_STORAGE_PREFIX }
	)
}

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
