import { cardsCollection } from '@/features/deck/collections'
import { phrasesFull } from '@/features/phrases/live'
import {
	phrasePlaylistsActive,
	playlistPhraseLinksActive,
} from '@/features/playlists/live'
import {
	commentPhraseLinksActive,
	phraseRequestsActive,
} from '@/features/requests/live'
import type { CardType } from '@/features/deck/schemas'

export async function preloadLibrary() {
	await Promise.all([
		phrasesFull.preload(),
		phraseRequestsActive.preload(),
		commentPhraseLinksActive.preload(),
		phrasePlaylistsActive.preload(),
		playlistPhraseLinksActive.preload(),
		cardsCollection.preload(),
	])
}

export type DeckStatus = CardType['status'] | null

export type LibraryPhrase = (typeof phrasesFull.toArray)[number]

export function langPhrases(lang: string) {
	return phrasesFull.toArray.filter((p) => p.lang === lang && !p.draft)
}

// A live query keys its rows by its own rules (a join's key is not the
// phrase id), so look rows up by their `id` field, not with `.get()`.
export function phraseById(id: string) {
	return phrasesFull.toArray.find((p) => p.id === id)
}

// A phrase has one card per direction; a phrase counts as active when any
// of them is.
export function deckStatusByPhrase(lang: string): Map<string, DeckStatus> {
	const out = new Map<string, DeckStatus>()
	for (const card of cardsCollection.toArray) {
		if (card.lang !== lang) continue
		const prior = out.get(card.phrase_id)
		if (prior === 'active') continue
		out.set(card.phrase_id, card.status)
	}
	return out
}

export function activePhraseIds(lang: string) {
	return [...deckStatusByPhrase(lang)]
		.filter(([, status]) => status === 'active')
		.map(([pid]) => pid)
}

export function translationFor(phrase: LibraryPhrase, translationLang: string) {
	const mine = phrase.translations.find((t) => t.lang === translationLang)
	return (mine ?? phrase.translations[0])?.text ?? null
}

export function langRequests(lang: string) {
	return phraseRequestsActive.toArray.filter((r) => r.lang === lang)
}

export function requestById(id: string) {
	return phraseRequestsActive.toArray.find((r) => r.id === id)
}

export function answerPhraseIds(requestId: string) {
	return [
		...new Set(
			commentPhraseLinksActive.toArray
				.filter((link) => link.request_id === requestId)
				.map((link) => link.phrase_id)
		),
	]
}

export function langPlaylists(lang: string) {
	return phrasePlaylistsActive.toArray.filter((p) => p.lang === lang)
}

export function playlistById(id: string) {
	return phrasePlaylistsActive.toArray.find((p) => p.id === id)
}

export function playlistPhraseIds(playlistId: string) {
	return playlistPhraseLinksActive.toArray
		.filter((link) => link.playlist_id === playlistId)
		.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map((link) => link.phrase_id)
}

const tokenize = (text: string) =>
	text
		.toLowerCase()
		.split(/[^\p{L}\p{M}\p{N}]+/u)
		.filter((word) => word.length >= 3)

export function keywordRank<T>(
	items: Array<T>,
	query: string,
	haystack: (item: T) => string
): Array<T> {
	const words = tokenize(query)
	if (!words.length) return []
	return items
		.map((item) => {
			const text = haystack(item).toLowerCase()
			return { item, score: words.filter((w) => text.includes(w)).length }
		})
		.filter((row) => row.score > 0)
		.toSorted((a, b) => b.score - a.score)
		.map((row) => row.item)
}
