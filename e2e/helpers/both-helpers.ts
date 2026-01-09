import type { Page } from '@playwright/test'
import { DailyReviewStateSchema } from '../../src/lib/schemas'
import { getReviewSessionState } from './db-helpers'
import { getReviewSessionLocal } from './collection-helpers'

/**
 * Get review session from both DB and local collection
 * Returns parsed, type-safe objects for easy comparison
 */
export async function getReviewSessionBoth(
	page: Page,
	uid: string,
	lang: string,
	daySession: string
) {
	// Fetch from DB
	const { data: fromDB } = await getReviewSessionState(uid, lang, daySession)
	const parsedDB = fromDB ? DailyReviewStateSchema.parse(fromDB) : null

	// Fetch from local collection
	const fromLocal = await getReviewSessionLocal(page, lang, daySession)

	return { fromDB: parsedDB, fromLocal }
}
