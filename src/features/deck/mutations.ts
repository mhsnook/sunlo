import { useNavigate } from '@tanstack/react-router'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import { useUserId } from '@/lib/use-auth'
import languages from '@/lib/languages'
import { cardsCollection, decksCollection } from './collections'
import { directionsForPhrase } from './card-directions'
import { updatePhraseLearnerCount } from './card-status'
import { DeckSchema, type CardType, type DeckType } from './schemas'

export function optimisticNewDeck(lang: string, uid: string): DeckType {
	return DeckSchema.parse({
		uid,
		lang,
		learning_goal: 'moving',
		archived: false,
		daily_review_goal: 15,
		preferred_translation_lang: null,
		review_answer_mode: null,
		created_at: new Date().toISOString(),
	})
}

export function useCreateDeck() {
	const navigate = useNavigate()
	const userId = useUserId()

	return (lang: string) => {
		const tx = decksCollection.insert(optimisticNewDeck(lang, userId!))
		tx.isPersisted.promise.then(
			() => toastSuccess(`Created a new deck to learn ${languages[lang]}`),
			(err: unknown) => {
				console.error('Error creating deck:', err)
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Error creating deck: ${message}`)
			}
		)
		void navigate({ to: `/learn/$lang`, params: { lang } })
	}
}

/**
 * Puts phrases in the deck as active cards: inserts the missing directions
 * and reactivates skipped ones. A learned card stays learned. Creates or
 * unarchives the deck first, because a card needs its deck row. Resolves with
 * the number of cards written, once the server has every write.
 */
export async function addPhrasesToDeck(
	lang: string,
	uid: string,
	phrases: Array<{ id: string; only_reverse: boolean | null }>
): Promise<number> {
	const deck = decksCollection.get(lang)
	if (!deck) {
		await decksCollection.insert(optimisticNewDeck(lang, uid)).isPersisted
			.promise
	} else if (deck.archived) {
		await decksCollection.update(lang, (draft) => {
			draft.archived = false
		}).isPersisted.promise
	}

	const existing = new Map(
		cardsCollection.toArray
			.filter((card) => card.lang === lang)
			.map((card) => [`${card.phrase_id}:${card.direction}`, card])
	)
	const nowIso = new Date().toISOString()
	const toInsert: Array<CardType> = []
	const toActivate: Array<string> = []
	const reverts: Array<() => void> = []
	for (const phrase of phrases) {
		const cards = directionsForPhrase(phrase.only_reverse).map((direction) => ({
			direction,
			card: existing.get(`${phrase.id}:${direction}`),
		}))
		const before = cards.find((c) => c.card?.status === 'active')
			? 'active'
			: cards.find((c) => c.card)?.card?.status
		for (const { direction, card } of cards) {
			if (card) {
				if (card.status === 'skipped') toActivate.push(card.id)
				continue
			}
			toInsert.push({
				id: crypto.randomUUID(),
				uid,
				phrase_id: phrase.id,
				lang,
				status: 'active',
				direction,
				created_at: nowIso,
				updated_at: nowIso,
			})
		}
		if (before !== 'learned') {
			const revert = updatePhraseLearnerCount(phrase.id, before, 'active')
			if (revert) reverts.push(revert)
		}
	}

	try {
		await Promise.all([
			toInsert.length
				? cardsCollection.insert(toInsert).isPersisted.promise
				: undefined,
			toActivate.length
				? cardsCollection.update(toActivate, (drafts) => {
						drafts.forEach((draft) => {
							draft.status = 'active'
						})
					}).isPersisted.promise
				: undefined,
		])
	} catch (err) {
		reverts.forEach((revert) => revert())
		throw err
	}
	return toInsert.length + toActivate.length
}
