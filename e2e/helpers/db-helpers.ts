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
			prompt: `${prompt} - ${Math.random()}`,
			requester_uid: TEST_USER_UID,
		})
		.select()
		.throwOnError()
		.single()

	// Insert phrase
	const { phrase, translation } = await createPhrase({
		lang,
		text: `${text} - ${Math.random()}`,
		translationText: `${translationText} - ${Math.random()}`,
		translationLang,
	})

	// Link the phrase to the request via comment
	const { data: comment } = await supabase
		.from('request_comment')
		.insert({
			request_id: request!.id,
			uid: TEST_USER_UID,
			content: 'Linked phrase',
		})
		.select()
		.single()

	if (comment) {
		await supabase.from('comment_phrase_link').insert({
			request_id: request!.id,
			comment_id: comment.id,
			phrase_id: phrase!.id,
			uid: TEST_USER_UID,
		})
	}

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
}) {
	const { lang, text, translationText, translationLang = 'eng' } = params

	// Insert phrase
	const { data: phrase } = await supabase
		.from('phrase')
		.insert({
			lang,
			text: `${text} - ${Math.random()}`,
			added_by: TEST_USER_UID,
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
 * Create a standalone phrase request (without fulfilling phrase)
 */
export async function createRequest(params: { lang: string; prompt: string }) {
	const { lang, prompt } = params

	const { data: request } = await supabase
		.from('phrase_request')
		.insert({
			lang,
			prompt: `${prompt} - ${Math.random()}`,
			requester_uid: TEST_USER_UID,
		})
		.select()
		.throwOnError()
		.single()

	if (!request) throw new Error('Failed to create request')
	return request
}

/**
 * Get a phrase request from the database
 */
export async function getRequest(requestId: string) {
	return await supabase
		.from('phrase_request')
		.select()
		.eq('id', requestId)
		.single()
}

// ============================================================================
// DECK HELPERS
// ============================================================================

/**
 * Create a deck for testing
 */
export async function createDeck(params: { lang: string; uid: string }) {
	const { lang, uid } = params

	const { data: deck } = await supabase
		.from('user_deck')
		.insert({
			lang,
			uid,
			daily_review_goal: 15,
			learning_goal: 'visiting',
		})
		.select()
		.throwOnError()
		.single()

	if (!deck) throw new Error('Failed to create deck')
	return deck
}

/**
 * Get a deck by language and user ID
 */
export async function getDeck(lang: string, uid: string) {
	return await supabase
		.from('user_deck_plus')
		.select()
		.eq('lang', lang)
		.eq('uid', uid)
		.throwOnError()
		.maybeSingle()
}

/**
 * Delete a deck
 */
export async function deleteDeck(lang: string, uid: string) {
	await supabase
		.from('user_deck')
		.delete()
		.eq('lang', lang)
		.eq('uid', uid)
		.throwOnError()
}

// ============================================================================
// PLAYLIST HELPERS
// ============================================================================

export async function createPlaylist(params: {
	lang: string
	title: string
	description?: string
}) {
	const { lang, title, description } = params
	const { data: playlist } = await supabase
		.from('phrase_playlist')
		.insert({
			lang,
			title,
			description,
			uid: TEST_USER_UID,
		})
		.select()
		.throwOnError()
		.single()

	if (!playlist) throw new Error('Failed to create playlist')
	return playlist
}

export async function deletePlaylist(id: string) {
	await supabase.from('phrase_playlist').delete().eq('id', id).throwOnError()
}

// ============================================================================
// REVIEW HELPERS
// ============================================================================

/**
 * Get review session state from database
 */
export async function getReviewSessionState(
	uid: string,
	lang: string,
	day: string
) {
	return await supabase
		.from('user_deck_review_state')
		.select()
		.eq('uid', uid)
		.eq('lang', lang)
		.eq('day_session', day)
		.maybeSingle()
}

/**
 * Clean up review session (delete from database)
 * Use clearReviewSessionFromLocal() from collection-helpers.ts to clear localStorage
 */
export async function cleanupReviewSession(
	uid: string,
	lang: string,
	daySession: string
) {
	await supabase
		.from('user_card_review')
		.delete()
		.eq('uid', uid)
		.eq('day_session', daySession)
		.eq('lang', lang)
		.throwOnError()
	await supabase
		.from('user_deck_review_state')
		.delete()
		.eq('uid', uid)
		.eq('lang', lang)
		.eq('day_session', daySession)
		.throwOnError()
}

/**
 * Get a single review record (most recent if multiple exist)
 */
export async function getReview(
	phraseId: string,
	uid: string,
	sessionDate: string
) {
	return await supabase
		.from('user_card_review')
		.select()
		.eq('phrase_id', phraseId)
		.eq('uid', uid)
		.eq('day_session', sessionDate)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
}

export async function getReviewByPhraseId(
	phraseId: string,
	uid: string,
	sessionDate: string
) {
	return await supabase
		.from('user_card_review')
		.select()
		.eq('phrase_id', phraseId)
		.eq('uid', uid)
		.eq('day_session', sessionDate)
		.limit(1)
		.order('created_at', { ascending: false })
		.maybeSingle()
}

/**
 * Get a card by phrase ID from the database for a specific user
 */
export async function getCardByPhraseId(phraseId: string, uid: string) {
	// Query the base table instead of the view to avoid potential view refresh issues
	return await supabase
		.from('user_card_plus')
		.select()
		.eq('phrase_id', phraseId)
		.eq('uid', uid)
		.throwOnError()
		.maybeSingle()
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
	'playlist_phrase_link',
	'phrase_playlist',
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
