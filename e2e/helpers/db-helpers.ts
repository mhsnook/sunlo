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
