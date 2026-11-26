import { cardsCollection } from '@/features/deck/collections'
import { cardReviewsCollection } from '@/features/review/collections'
import { phrasesFull } from '@/features/phrases/live'
import {
	phrasePlaylistsActive,
	playlistPhraseLinksActive,
} from '@/features/playlists/live'
import {
	commentPhraseLinksActive,
	phraseRequestsActive,
} from '@/features/requests/live'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import type { CardType } from '@/features/deck/schemas'

// What the coach page renders: the sets the coach shows hold only ids, and
// the page draws them from these collections.
export async function preloadLibrary() {
	await Promise.all([
		phrasesFull.preload(),
		phraseRequestsActive.preload(),
		commentPhraseLinksActive.preload(),
		phrasePlaylistsActive.preload(),
		playlistPhraseLinksActive.preload(),
		cardsCollection.preload(),
	])
	// Only the deck stack's stage reads reviews, so the page need not wait.
	void cardReviewsCollection.preload()
}

export type DeckStatus = CardType['status'] | null

type LibraryPhrase = (typeof phrasesFull.toArray)[number]

// A phrase has one card per direction; a phrase counts as active when any
// of them is.
export function statusesFromCards(
	cards: Array<Pick<CardType, 'phrase_id' | 'status'>>
): Map<string, DeckStatus> {
	const out = new Map<string, DeckStatus>()
	for (const card of cards) {
		if (out.get(card.phrase_id) === 'active') continue
		out.set(card.phrase_id, card.status)
	}
	return out
}

export const activeIds = (statuses: Map<string, DeckStatus>) =>
	[...statuses].filter(([, s]) => s === 'active').map(([pid]) => pid)

// A phrase's age is its newest card's. Optimistic rows carry
// toISOString() and synced rows Postgres's format, so compare times, not text.
export function activeIdsNewestFirst(
	cards: Array<Pick<CardType, 'phrase_id' | 'status' | 'created_at'>>
) {
	const newest = new Map<string, number>()
	for (const card of cards) {
		const time = Date.parse(card.created_at)
		if ((newest.get(card.phrase_id) ?? 0) < time)
			newest.set(card.phrase_id, time)
	}
	return activeIds(statusesFromCards(cards)).toSorted(
		(a, b) => (newest.get(b) ?? 0) - (newest.get(a) ?? 0)
	)
}

export function countTags(phrases: Array<{ tags: Array<{ name: string }> }>) {
	const counts = new Map<string, number>()
	for (const p of phrases)
		for (const t of p.tags) counts.set(t.name, (counts.get(t.name) ?? 0) + 1)
	return [...counts]
		.toSorted((a, b) => b[1] - a[1])
		.map(([name, count]) => ({ name, count }))
}

export function translationFor(phrase: LibraryPhrase, translationLang: string) {
	const { translations_mine } = splitPhraseTranslations(phrase, [
		translationLang,
	])
	return (translations_mine[0] ?? phrase.translations[0])?.text ?? null
}

export function answerPhraseIds(
	requestId: string,
	links: Array<{ request_id: string; phrase_id: string }>
) {
	return [
		...new Set(
			links
				.filter((link) => link.request_id === requestId)
				.map((link) => link.phrase_id)
		),
	]
}

export function playlistPhraseIds(playlistId: string) {
	return playlistPhraseLinksActive.toArray
		.filter((link) => link.playlist_id === playlistId)
		.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map((link) => link.phrase_id)
}
