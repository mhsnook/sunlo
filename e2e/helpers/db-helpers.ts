import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Create a Supabase client with service role key for unrestricted DB access
const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Get a phrase with translations from the database
 */
export async function getPhrase(id: string) {
	return await supabase
		.from('meta_phrase_info')
		.select('*, translations:phrase_translation(*)')
		.eq('id', id)
		.single()
}

/**
 * Get a card by phrase ID from the database
 */
export async function getCardByPhraseId(phraseId: string) {
	return await supabase
		.from('user_card_plus')
		.select()
		.eq('phrase_id', phraseId)
		.single()
}

/**
 * Get a deck from the database
 */
export async function getDeck(lang: string, uid: string) {
	return await supabase
		.from('user_deck_plus')
		.select()
		.eq('lang', lang)
		.eq('uid', uid)
		.single()
}

/**
 * Get reviews for a card from the database
 */
export async function getReviewsForCard(cardId: string) {
	return await supabase
		.from('user_card_review')
		.select()
		.eq('card_id', cardId)
		.order('created_at', { ascending: false })
}

/**
 * Get a friend summary from the database
 */
export async function getFriendSummary(uid: string, myUid: string) {
	return await supabase
		.from('friend_summary')
		.select()
		.eq('uid', uid)
		.eq('my_uid', myUid)
		.single()
}

/**
 * Get user profile from the database
 */
export async function getUserProfile(uid: string) {
	return await supabase.from('user_profile').select().eq('uid', uid).single()
}

/**
 * Count reviews for a card on a specific date
 */
export async function countReviewsForCardOnDate(cardId: string, date: string) {
	const { count } = await supabase
		.from('user_card_review')
		.select('*', { count: 'exact', head: true })
		.eq('card_id', cardId)
		.gte('created_at', date)
		.lt(
			'created_at',
			new Date(new Date(date).getTime() + 86400000).toISOString()
		)

	return count
}

/**
 * Count phrases for a specific language
 */
export async function countPhrasesByLang(lang: string) {
	const { count } = await supabase
		.from('phrase')
		.select('*', { count: 'exact', head: true })
		.eq('lang', lang)

	return count ?? 0
}

/**
 * Count all phrase translations
 */
export async function countTranslations() {
	const { count } = await supabase
		.from('phrase_translation')
		.select('*', { count: 'exact', head: true })

	return count ?? 0
}

// ============================================================================
// CLEANUP HELPERS - for making tests idempotent
// ============================================================================

/**
 * Delete all records created after a certain timestamp
 * This makes tests idempotent without tracking individual IDs
 */

const tableOrder = [
	'user_card_review',
	'user_card',
	'user_deck',
	'phrase_translation',
	'phrase_tag',
	'phrase',
	'tag',
	'phrase_request',
	'friend_request_action',
	'chat_message',
	'user_profile',
]

export async function cleanupAfterTimestamp(
	timestamp: Date,
	tables?: string[]
) {
	const isoTimestamp = timestamp.toISOString()
	// keeps the correct dependency original without the test-writer having to know it
	const tablesToClean =
		!tables ? tableOrder : tableOrder.filter((t) => tables?.includes(t))
	tables.forEach(
		(name) => await supabase.from(name).delete().gte('created_at', isoTimestamp)
	)
}

/**
 * Helper class to automatically track test start time and cleanup
 */
export class TestCleanup {
	private startTime: Date

	constructor() {
		this.startTime = new Date()
	}

	/**
	 * Delete all records created since this TestCleanup was instantiated
	 */
	async cleanup(tables?: string[]) {
		await cleanupAfterTimestamp(this.startTime, tables)
	}

	/**
	 * Get the start timestamp for manual cleanup
	 */
	getStartTime() {
		return this.startTime
	}
}
