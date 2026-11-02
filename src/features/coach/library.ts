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
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
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

export const phraseById = (id: string) => phrasesFull.get(id)
export const requestById = (id: string) => phraseRequestsActive.get(id)
export const playlistById = (id: string) => phrasePlaylistsActive.get(id)

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

export const deckStatusByPhrase = (lang: string) =>
	statusesFromCards(cardsCollection.toArray.filter((c) => c.lang === lang))

export const activeIds = (statuses: Map<string, DeckStatus>) =>
	[...statuses].filter(([, s]) => s === 'active').map(([pid]) => pid)

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

export function langRequests(lang: string) {
	return phraseRequestsActive.toArray.filter((r) => r.lang === lang)
}

export function answerPhraseIds(
	requestId: string,
	links: Array<{
		request_id: string
		phrase_id: string
	}> = commentPhraseLinksActive.toArray
) {
	return [
		...new Set(
			links
				.filter((link) => link.request_id === requestId)
				.map((link) => link.phrase_id)
		),
	]
}

export function langPlaylists(lang: string) {
	return phrasePlaylistsActive.toArray.filter((p) => p.lang === lang)
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
