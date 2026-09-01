import { and, eq, ilike, inArray } from '@tanstack/db'
import { useLiveQuery } from '@tanstack/react-db'
import { useEffect, useMemo } from 'react'

import type { pids, UseLiveQueryResult, uuid } from '@/types/main'
import {
	PhraseTagLinkSchema,
	type PhraseFullFilteredType,
	type PhraseFullFullType,
	type PhraseFullType,
	type TranslationType,
} from './schemas'
import {
	phraseTagLinksCollection,
	phraseTranslationsCollection,
} from './collections'
import {
	phrasesFull,
	phrasesComposed,
	usePhrasePlaylists,
	usePhraseComments,
	type PhraseProvenanceItem,
} from './live'
import { useLanguagesToShow } from '@/features/profile/hooks'
import { splitPhraseTranslations } from '@/hooks/composite-phrase'
import supabase from '@/lib/supabase-client'
import { bindRows } from '@/lib/collections/realtime'
import { useUserId } from '@/lib/use-auth'

export const useLanguagePhrases = (
	lang: string
): UseLiveQueryResult<PhraseFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

/**
 * Phrases for a language with translations composed in. No profile join —
 * use this when you don't need the author's public profile (charts,
 * manage-deck, etc).
 */
export const useLangPhrasesRaw = (
	lang: string
): UseLiveQueryResult<PhraseFullType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesComposed })
				.where(({ phrase }) => eq(phrase.lang, lang)),
		[lang]
	)

/**
 * Every translation on a phrase, the archived ones included.
 *
 * Only the manage-translations dialog wants this, because it is the surface
 * that archives and restores them and has to show what it would restore.
 * Every other reader takes `phrase.translations` off `phrasesFull`, which
 * has already dropped them.
 */
export const useAllPhraseTranslations = (
	phraseId: uuid
): UseLiveQueryResult<TranslationType[]> =>
	useLiveQuery(
		(q) =>
			q
				.from({ translation: phraseTranslationsCollection })
				.where(({ translation }) => eq(translation.phrase_id, phraseId))
				.orderBy(({ translation }) => translation.lang, 'asc'),
		[phraseId]
	)

/** A single phrase by id with its translations composed in. */
export const useOnePhrase = (
	pid: uuid | undefined | null
): UseLiveQueryResult<PhraseFullType> =>
	useLiveQuery(
		(q) =>
			!pid
				? undefined
				: q
						.from({ phrase: phrasesComposed })
						.where(({ phrase }) => eq(phrase.id, pid))
						.findOne(),
		[pid]
	)

export const useLanguagePhrasesSearch = (
	lang: string | undefined,
	queryString: string | undefined,
	tags?: string[] | null,
	filteredPids?: pids | null
): UseLiveQueryResult<PhraseFullFilteredType[]> => {
	const { data: langs } = useLanguagesToShow()
	return useLiveQuery(
		(q) => {
			if (!queryString && !tags?.length && !filteredPids) {
				return undefined
			}
			let query = q.from({ phrase: phrasesFull })
			if (lang) {
				query = query.where(({ phrase }) => eq(phrase.lang, lang))
			}
			if (queryString) {
				query = query.where(({ phrase }) =>
					ilike(phrase.searchableText, `%${queryString}%`)
				)
			}
			if (filteredPids) {
				query = query.where(({ phrase }) => inArray(phrase.id, filteredPids))
			}
			if (tags?.length) {
				query = query.fn.where(({ phrase }) => {
					if (!phrase?.tags) return false
					return tags.every((selectedTag) =>
						(phrase.tags ?? []).some(
							(phraseTag) => phraseTag?.name === selectedTag
						)
					)
				})
			}
			return query.fn.select(({ phrase }) =>
				splitPhraseTranslations(phrase, langs)
			)
		},
		[lang, queryString, tags, filteredPids, langs]
	)
}

export const useLanguagePhrase = (
	pid: uuid | null | undefined
): UseLiveQueryResult<PhraseFullFullType> =>
	useLiveQuery(
		(q) =>
			!pid
				? undefined
				: q
						.from({ phrase: phrasesFull })
						.where(({ phrase }) => eq(phrase.id, pid))
						.findOne(),
		[pid]
	)

export function useAllMyPhrasesLang(
	lang: string
): UseLiveQueryResult<PhraseFullType[]> {
	const userId = useUserId()
	return useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) =>
					and(eq(phrase.added_by, userId), eq(phrase.lang, lang))
				)
				.orderBy(({ phrase }) => phrase.created_at, 'desc'),
		[userId, lang]
	)
}

export function useAnyonesPhrases(
	uid: uuid,
	lang?: string
): UseLiveQueryResult<PhraseFullFullType[]> {
	return useLiveQuery(
		(q) => {
			let query = q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => eq(phrase.added_by, uid))
			if (lang) query = query.where(({ phrase }) => eq(phrase.lang, lang))
			return query.orderBy(({ phrase }) => phrase.created_at, 'desc')
		},
		[lang, uid]
	)
}

/**
 * Get all provenance items (playlists + comments) sorted by date.
 * Underlying joins live in `phrases/live.ts`.
 */
export function usePhraseProvenance(phraseId: uuid): PhraseProvenanceItem[] {
	const { data: playlists } = usePhrasePlaylists(phraseId)
	const { data: comments } = usePhraseComments(phraseId)

	return useMemo(
		() =>
			[...(playlists ?? []), ...(comments ?? [])].toSorted((a, b) =>
				a.created_at === b.created_at ? 0 : a.created_at > b.created_at ? -1 : 1
			),
		[playlists, comments]
	)
}

/**
 * Live updates for one phrase, mounted by the phrase detail route: its tag
 * links, removals included (a removal is a flagged row, an ordinary UPDATE
 * frame). One channel per phrase, torn down on navigate — the "thread
 * tables" posture in docs/mutations.md.
 *
 * The `phrase` and `phrase_translation` rows are not bound: their SELECT
 * policies hide archived rows, and a table narrowed that way must not
 * publish (docs/database.md "Gotchas"). Binding them waits on the two-step
 * delete — and the `phrase` binding will need to spread the held row under
 * the frame, because the frame comes off the base table and lacks the
 * `phrase_meta` view's stats columns.
 */
export const usePhraseRealtime = (phraseId: uuid) => {
	useEffect(() => {
		let channel = supabase.channel(`phrase-thread-${phraseId}`)
		channel = bindRows(
			channel,
			'phrase_tag',
			`phrase_id=eq.${phraseId}`,
			phraseTagLinksCollection,
			(row) => PhraseTagLinkSchema.parse(row)
		)
		channel.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [phraseId])
}
