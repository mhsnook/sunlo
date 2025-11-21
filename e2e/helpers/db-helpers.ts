import { createClient } from '@supabase/supabase-js'
import { Database } from '../../src/types/supabase'
import { TEST_USER_UID } from './auth-helpers'

// Create a Supabase client with service role key for unrestricted DB access
export const supabase = createClient<Database>(
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
 * Create a phrase request with a phrase and translation via API
 */
export async function createRequestAndPhrase(params: {
	lang: string
	prompt: string
	text: string
	translationText: string
	translationLang?: string
}) {
	const {
		lang,
		prompt,
		text,
		translationText,
		translationLang = 'eng',
	} = params

	// Insert request
	const { data: request } = await supabase
		.from('phrase_request')
		.insert({
			lang,
			prompt,
			requester_uid: TEST_USER_UID,
		})
		.select()
		.throwOnError()
		.single()

	// Insert phrase
	const { phrase, translation } = await createPhrase({
		lang,
		text,
		translationText,
		translationLang,
		requestId: request!.id,
	})

	return { request, phrase, translation }
}

/**
 * Create a phrase with a translation via API
 */
export async function createPhrase(params: {
	lang: string
	text: string
	translationText: string
	translationLang?: string
	requestId?: string
}) {
	const { lang, text, translationText, translationLang = 'eng' } = params

	// Insert phrase
	const { data: phrase } = await supabase
		.from('phrase')
		.insert({
			lang,
			text: `${text} - ${Math.random()}`,
			added_by: TEST_USER_UID,
			request_id: params.requestId,
		})
		.select()
		.throwOnError()
		.single()

	// Insert translation
	const { data: translation } = await supabase
		.from('phrase_translation')
		.insert({
			phrase_id: phrase!.id,
			lang: translationLang,
			text: `${translationText} - ${Math.random()}`,
			added_by: TEST_USER_UID,
		})
		.select()
		.throwOnError()
		.single()
	if (!phrase || !translation)
		throw new Error('Failed to create phrase or translation')
	return { phrase, translation }
}

/**
 * Delete a phrase and its related data (cascades to translations, cards, reviews)
 */
export async function deletePhrase(phraseId: string) {
	// Deletion will cascade to translations, cards, and reviews due to foreign key constraints
	await supabase.from('phrase').delete().eq('id', phraseId).throwOnError()
}

/**
 * Delete a card
 */
export async function deleteCard(cardId: string) {
	await supabase.from('user_card').delete().eq('id', cardId).throwOnError()
}

/**
 * Delete a phrase request
 */
export async function deleteRequest(requestId: string) {
	await supabase
		.from('phrase_request')
		.delete()
		.eq('id', requestId)
		.throwOnError()
}

/**
 * Get a card by phrase ID from the database for a specific user
 */
export async function getCardByPhraseId(phraseId: string, uid: string) {
	// Query the base table instead of the view to avoid potential view refresh issues
	return await supabase
		.from('user_card')
		.select()
		.eq('phrase_id', phraseId)
		.eq('uid', uid)
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
	'chat_message',
	'phrase',
	'tag',
	'phrase_request',
	'friend_request_action',
	'user_profile',
] as const

type TableName = (typeof tableOrder)[number]

export async function cleanupAfterTimestamp(
	timestamp: Date,
	tables?: TableName[]
) {
	const isoTimestamp = timestamp.toISOString()
	// keeps the correct dependency original without the test-writer having to know it
	const tablesToClean =
		!tables ? tableOrder : tableOrder.filter((t) => tables?.includes(t))
	tablesToClean.forEach(
		async (name) =>
			await supabase.from(name).delete().gte('created_at', isoTimestamp)
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
	async cleanup(tables?: TableName[]) {
		await cleanupAfterTimestamp(this.startTime, tables)
	}

	/**
	 * Get the start timestamp for manual cleanup
	 */
	getStartTime() {
		return this.startTime
	}
}
