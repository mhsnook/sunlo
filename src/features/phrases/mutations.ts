import { createOptimisticAction } from '@tanstack/db'

import supabase from '@/lib/supabase-client'
import type { uuid } from '@/types/main'
import {
	phrasesCollection,
	phraseTagLinksCollection,
	phraseTranslationsCollection,
} from './collections'
import { cardsCollection } from '@/features/deck/collections'
import { langTagsCollection } from '@/features/languages/collections'

// Replaces the old `add_phrase_translation_card` RPC. Inserts a phrase,
// its first translation, and optional cards in one optimistic transaction.
// Sequential persistence so FK ordering holds: phrase before translation,
// phrase before cards.
type CreatePhraseWithTranslationInput = {
	phraseId: uuid
	translationId: uuid
	lang: string
	text: string
	onlyReverse: boolean
	translationLang: string
	translationText: string
	uid: uuid
	cards: Array<{
		id: uuid
		direction: 'forward' | 'reverse'
	}>
}

export const createPhraseWithTranslation =
	createOptimisticAction<CreatePhraseWithTranslationInput>({
		onMutate: ({
			phraseId,
			translationId,
			lang,
			text,
			onlyReverse,
			translationLang,
			translationText,
			uid,
			cards,
		}) => {
			const now = new Date().toISOString()
			phrasesCollection.insert({
				id: phraseId,
				lang,
				text,
				only_reverse: onlyReverse,
				added_by: uid,
				archived: false,
				created_at: now,
				avg_difficulty: null,
				avg_stability: null,
				count_learners: cards.length > 0 ? 1 : 0,
			})
			phraseTranslationsCollection.insert({
				id: translationId,
				phrase_id: phraseId,
				lang: translationLang,
				text: translationText,
				added_by: uid,
				archived: false,
				created_at: now,
				updated_at: now,
			})
			for (const c of cards) {
				cardsCollection.insert({
					id: c.id,
					phrase_id: phraseId,
					lang,
					uid,
					status: 'active',
					direction: c.direction,
					created_at: now,
					updated_at: now,
					last_reviewed_at: null,
					stability: null,
					difficulty: null,
				})
			}
		},
		mutationFn: async ({
			phraseId,
			translationId,
			lang,
			text,
			onlyReverse,
			translationLang,
			translationText,
			uid,
			cards,
		}) => {
			await supabase
				.from('phrase')
				.insert({
					id: phraseId,
					lang,
					text,
					only_reverse: onlyReverse,
					added_by: uid,
				})
				.throwOnError()
			await supabase
				.from('phrase_translation')
				.insert({
					id: translationId,
					phrase_id: phraseId,
					lang: translationLang,
					text: translationText,
					added_by: uid,
				})
				.throwOnError()
			if (cards.length) {
				await supabase
					.from('user_card')
					.insert(
						cards.map((c) => ({
							id: c.id,
							phrase_id: phraseId,
							lang,
							uid,
							status: 'active' as const,
							direction: c.direction,
						}))
					)
					.throwOnError()
			}
		},
	})

// Inverse of `add_phrase_translation_card`'s card-direction logic: a
// non-`only_reverse` phrase gets a forward card; every card also gets a
// reverse companion. Returns pre-generated IDs so optimistic and
// persistent stages share the same row IDs.
export function buildCardSet(
	onlyReverse: boolean
): CreatePhraseWithTranslationInput['cards'] {
	const cards: CreatePhraseWithTranslationInput['cards'] = []
	if (!onlyReverse) {
		cards.push({ id: crypto.randomUUID(), direction: 'forward' })
	}
	cards.push({ id: crypto.randomUUID(), direction: 'reverse' })
	return cards
}

// Replaces the old `bulk_add_phrases` + per-phrase `add_tags_to_phrase` RPCs.
// Caller pre-resolves tag IDs (existing tags reuse their ID; new tags get a
// fresh uuid shared across the batch so a name appearing on multiple phrases
// only creates one tag row). New tags listed in `newTags` are inserted once.
type BulkAddPhrasesInput = {
	lang: string
	uid: uuid
	newTags: Array<{ id: uuid; name: string }>
	phrases: Array<{
		phraseId: uuid
		text: string
		onlyReverse: boolean
		translations: Array<{ id: uuid; lang: string; text: string }>
		cards: Array<{ id: uuid; direction: 'forward' | 'reverse' }>
		tagIds: Array<uuid>
	}>
}

export const bulkAddPhrases = createOptimisticAction<BulkAddPhrasesInput>({
	onMutate: ({ lang, uid, newTags, phrases }) => {
		const now = new Date().toISOString()
		for (const t of newTags) {
			langTagsCollection.insert({
				id: t.id,
				name: t.name,
				lang,
				added_by: uid,
				created_at: now,
			})
		}
		for (const p of phrases) {
			phrasesCollection.insert({
				id: p.phraseId,
				lang,
				text: p.text,
				only_reverse: p.onlyReverse,
				added_by: uid,
				archived: false,
				created_at: now,
				avg_difficulty: null,
				avg_stability: null,
				count_learners: p.cards.length > 0 ? 1 : 0,
			})
			for (const t of p.translations) {
				phraseTranslationsCollection.insert({
					id: t.id,
					phrase_id: p.phraseId,
					lang: t.lang,
					text: t.text,
					added_by: uid,
					archived: false,
					created_at: now,
					updated_at: now,
				})
			}
			for (const c of p.cards) {
				cardsCollection.insert({
					id: c.id,
					phrase_id: p.phraseId,
					lang,
					uid,
					status: 'active',
					direction: c.direction,
					created_at: now,
					updated_at: now,
					last_reviewed_at: null,
					stability: null,
					difficulty: null,
				})
			}
			for (const tagId of p.tagIds) {
				phraseTagLinksCollection.insert({
					phrase_id: p.phraseId,
					tag_id: tagId,
					added_by: uid,
					created_at: now,
				})
			}
		}
	},
	mutationFn: async ({ lang, uid, newTags, phrases }) => {
		if (newTags.length) {
			await supabase
				.from('tag')
				.insert(
					newTags.map((t) => ({
						id: t.id,
						name: t.name,
						lang,
						added_by: uid,
					}))
				)
				.throwOnError()
		}
		if (phrases.length) {
			await supabase
				.from('phrase')
				.insert(
					phrases.map((p) => ({
						id: p.phraseId,
						lang,
						text: p.text,
						only_reverse: p.onlyReverse,
						added_by: uid,
					}))
				)
				.throwOnError()
		}
		const translationRows = phrases.flatMap((p) =>
			p.translations.map((t) => ({
				id: t.id,
				phrase_id: p.phraseId,
				lang: t.lang,
				text: t.text,
				added_by: uid,
			}))
		)
		if (translationRows.length) {
			await supabase
				.from('phrase_translation')
				.insert(translationRows)
				.throwOnError()
		}
		const cardRows = phrases.flatMap((p) =>
			p.cards.map((c) => ({
				id: c.id,
				phrase_id: p.phraseId,
				lang,
				uid,
				status: 'active' as const,
				direction: c.direction,
			}))
		)
		if (cardRows.length) {
			await supabase.from('user_card').insert(cardRows).throwOnError()
		}
		const linkRows = phrases.flatMap((p) =>
			p.tagIds.map((tagId) => ({
				phrase_id: p.phraseId,
				tag_id: tagId,
				added_by: uid,
			}))
		)
		if (linkRows.length) {
			await supabase.from('phrase_tag').insert(linkRows).throwOnError()
		}
	},
})
