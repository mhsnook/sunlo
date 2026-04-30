// Issue #104 - "Test: assumptions about set memberships/exclusions"
//
// The codebase makes a number of set-membership assumptions on the client:
// - every card.phrase_id points to a phrase we can load
// - every card.status is one of {active, learned, skipped}
// - every card.direction is one of {forward, reverse}
// - every manifest entry in user_deck_review_state has a matching card row
// - every comment_phrase_link.phrase_id resolves to a visible phrase
// - every chat_message.phrase_id / request_id / playlist_id resolves
//
// The issue asks for runtime logging so we can investigate when an
// assumption is violated. Until a dedicated logging service is wired up,
// this scene approximates the goal two ways:
//
//   1. It walks a learner through the flows that rely on these invariants
//      (deck feed, review setup, chat with shared preview, request thread
//      with phrase-answer links). Any runtime assumption that blows up
//      will surface as a missing testid or a JS error.
//
//   2. After the walk, it runs direct server queries that enumerate the
//      invariants above and fail fast if any row violates them. This is
//      cheap to run on seed data and forms a regression net for future
//      migrations that might break a referenced set (e.g. adding a new
//      card status that the UI doesn't render).
//
// When the logging service lands, these assertions should move into
// useTestEffect hooks on the relevant components so they fire under real
// user conditions, not just seed data.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'
import defaultTeam from '../actors/default'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CARD_STATUSES = new Set(['active', 'learned', 'skipped'])
const CARD_DIRECTIONS = new Set(['forward', 'reverse'])

test('walk common flows; core set-membership invariants hold', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang
	const learner = await actor('learner')
	const uid = learner.key
	const learner2Key = defaultTeam.actors!['learner2']!.key

	await learner
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		// Deck feed depends on card.phrase_id → phrase resolution
		.openTo('/learn')
		.see(`deck-tile-${lang}`)
		.click(`decks-list-grid ${lang} deck-tile`)
		.click('deck-link')
		.see('deck-feed-page')
		// Review setup depends on manifest → card resolution
		.openTo(`/learn/${lang}/review`)
		.up()
		.ifClick('review-intro-dismiss')
		.see('review-setup-page')
		// Chat request preview depends on chat_message.request_id → request
		.openTo(`/friends/chats/${learner2Key}`)
		.see('chat-messages-container')
		.see('chat-request-preview')
		// Server-side invariant sweep
		.do(async () => {
			// 1. Every user_card points to a real phrase and has valid enums.
			const { data: cards } = await supabase
				.from('user_card')
				.select('id, phrase_id, status, direction')
				.eq('uid', uid)
				.eq('lang', lang)
			if (!cards) throw new Error('Expected user_card rows for learner')
			const phraseIds = Array.from(new Set(cards.map((c) => c.phrase_id)))
			const { data: phrases } = await supabase
				.from('phrase')
				.select('id')
				.in('id', phraseIds)
			const phraseSet = new Set((phrases ?? []).map((p) => p.id))
			for (const c of cards) {
				if (!phraseSet.has(c.phrase_id)) {
					throw new Error(
						`card ${c.id} references missing phrase ${c.phrase_id} (#104 set-membership)`
					)
				}
				if (!CARD_STATUSES.has(c.status)) {
					throw new Error(
						`card ${c.id} has unexpected status "${c.status}" not in {active, learned, skipped}`
					)
				}
				if (!CARD_DIRECTIONS.has(c.direction)) {
					throw new Error(
						`card ${c.id} has unexpected direction "${c.direction}" not in {forward, reverse}`
					)
				}
			}

			// 2. Every manifest entry for today corresponds to a card row.
			const { data: state } = await supabase
				.from('user_deck_review_state')
				.select('manifest')
				.eq('uid', uid)
				.eq('lang', lang)
				.maybeSingle()
			const manifest = (state?.manifest as string[] | null) ?? []
			if (manifest.length) {
				const cardIds = new Set(cards.map((c) => c.id))
				for (const mid of manifest) {
					if (!cardIds.has(mid)) {
						throw new Error(
							`manifest entry ${mid} has no matching user_card row for learner (#104)`
						)
					}
				}
			}

			// 3. Every comment_phrase_link on a request the learner can read
			//    resolves to a phrase. This catches orphaned answer links.
			const { data: links } = await supabase
				.from('comment_phrase_link')
				.select('id, phrase_id')
				.limit(500)
			const linkPhraseIds = Array.from(
				new Set((links ?? []).map((l) => l.phrase_id))
			)
			if (linkPhraseIds.length) {
				const { data: linkPhrases } = await supabase
					.from('phrase')
					.select('id')
					.in('id', linkPhraseIds)
				const linkPhraseSet = new Set((linkPhrases ?? []).map((p) => p.id))
				for (const l of links ?? []) {
					if (!linkPhraseSet.has(l.phrase_id)) {
						throw new Error(
							`comment_phrase_link ${l.id} references missing phrase ${l.phrase_id} (#104)`
						)
					}
				}
			}

			// 4. Every chat_message payload that references a phrase/request
			//    points to a live row. A dangling reference crashes the chat
			//    thread for one of the two friends.
			const { data: messages } = await supabase
				.from('chat_message')
				.select('id, phrase_id, request_id, playlist_id')
				.or(`sender_uid.eq.${uid},recipient_uid.eq.${uid}`)
			const msgPhraseIds = Array.from(
				new Set(
					(messages ?? []).flatMap((m) => (m.phrase_id ? [m.phrase_id] : []))
				)
			)
			if (msgPhraseIds.length) {
				const { data: msgPhrases } = await supabase
					.from('phrase')
					.select('id')
					.in('id', msgPhraseIds)
				const msgPhraseSet = new Set((msgPhrases ?? []).map((p) => p.id))
				for (const m of messages ?? []) {
					if (m.phrase_id && !msgPhraseSet.has(m.phrase_id)) {
						throw new Error(
							`chat_message ${m.id} references missing phrase ${m.phrase_id} (#104)`
						)
					}
				}
			}
			const msgRequestIds = Array.from(
				new Set(
					(messages ?? []).flatMap((m) => (m.request_id ? [m.request_id] : []))
				)
			)
			if (msgRequestIds.length) {
				const { data: msgRequests } = await supabase
					.from('phrase_request')
					.select('id')
					.in('id', msgRequestIds)
				const msgRequestSet = new Set((msgRequests ?? []).map((r) => r.id))
				for (const m of messages ?? []) {
					if (m.request_id && !msgRequestSet.has(m.request_id)) {
						throw new Error(
							`chat_message ${m.id} references missing phrase_request ${m.request_id} (#104)`
						)
					}
				}
			}
		})
})
