import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { eq, inArray, useLiveQuery } from '@tanstack/react-db'
import { cardsCollection } from '@/features/deck/collections'
import { usePreferredTranslationLang } from '@/features/deck/hooks'
import { phrasesFull } from '@/features/phrases/live'
import { phrasePlaylistsActive } from '@/features/playlists/live'
import { useProfile } from '@/features/profile/hooks'
import {
	commentPhraseLinksActive,
	phraseRequestsActive,
} from '@/features/requests/live'
import { useUserId } from '@/lib/use-auth'
import { sendToCoach } from './engine'
import type { DeckStatus } from './library'
import { emptyThread, threadKey, useCoachStore } from './store'
import type { NavTarget, ToolContext } from './tools'

export function useCoachThread(key: string) {
	return useCoachStore((state) => state.threads[key] ?? emptyThread)
}

export function useCoachBusy(key: string) {
	return useCoachStore((state) => !!state.busy[key])
}

function useNavTarget(lang: string) {
	const navigate = useNavigate()
	return useCallback(
		(target: NavTarget) => {
			const id = target.id ?? ''
			switch (target.to) {
				case 'deck':
					return void navigate({ to: '/learn/$lang', params: { lang } })
				case 'review':
					return void navigate({ to: '/learn/$lang/review', params: { lang } })
				case 'profile':
					return void navigate({ to: '/profile' })
				case 'phrase':
					return void navigate({
						to: '/learn/$lang/phrases/$id',
						params: { lang, id },
					})
				case 'playlist':
					return void navigate({
						to: '/learn/$lang/playlists/$playlistId',
						params: { lang, playlistId: id },
					})
				case 'request':
					return void navigate({
						to: '/learn/$lang/requests/$id',
						params: { lang, id },
					})
			}
		},
		[navigate, lang]
	)
}

export function useCoach(lang: string) {
	const uid = useUserId()
	const { data: profile } = useProfile()
	const translationLang = usePreferredTranslationLang(lang)
	const navigate = useNavTarget(lang)
	const key = threadKey(uid ?? 'anon', lang)
	const learnerName = profile?.username ?? null

	const ctx = useMemo<ToolContext | null>(
		() => (uid ? { key, lang, translationLang, uid, navigate } : null),
		[key, lang, translationLang, uid, navigate]
	)

	const send = useCallback(
		(text: string) => {
			if (ctx) void sendToCoach({ ctx, learnerName, text })
		},
		[ctx, learnerName]
	)

	return { key, ctx, send, translationLang, learnerName }
}

export function useDeckStatuses(lang: string) {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ card: cardsCollection })
				.where(({ card }) => eq(card.lang, lang)),
		[lang]
	)
	return useMemo(() => {
		const out = new Map<string, DeckStatus>()
		for (const card of data ?? []) {
			if (out.get(card.phrase_id) === 'active') continue
			out.set(card.phrase_id, card.status)
		}
		return out
	}, [data])
}

function inOrder<T extends { id: string }>(
	rows: Array<T> | undefined,
	ids: Array<string>
) {
	const byId = new Map((rows ?? []).map((row) => [row.id, row]))
	return ids.flatMap((id) => {
		const row = byId.get(id)
		return row ? [row] : []
	})
}

export function usePhrasesByIds(ids: Array<string>) {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ phrase: phrasesFull })
				.where(({ phrase }) => inArray(phrase.id, ids)),
		[ids.join(',')]
	)
	return useMemo(() => inOrder(data, ids), [data, ids])
}

export function useRequestsByIds(ids: Array<string>) {
	const { data: requests } = useLiveQuery(
		(q) =>
			q
				.from({ request: phraseRequestsActive })
				.where(({ request }) => inArray(request.id, ids)),
		[ids.join(',')]
	)
	const { data: links } = useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinksActive })
				.where(({ link }) => inArray(link.request_id, ids)),
		[ids.join(',')]
	)
	return useMemo(
		() =>
			// oxlint-disable-next-line no-map-spread -- the rows belong to the live query; mutating them would change its data
			inOrder(requests, ids).map((request) => ({
				...request,
				answerIds: [
					...new Set(
						(links ?? [])
							.filter((link) => link.request_id === request.id)
							.map((link) => link.phrase_id)
					),
				],
			})),
		[requests, links, ids]
	)
}

export function usePlaylistsByIds(ids: Array<string>) {
	const { data } = useLiveQuery(
		(q) =>
			q
				.from({ playlist: phrasePlaylistsActive })
				.where(({ playlist }) => inArray(playlist.id, ids)),
		[ids.join(',')]
	)
	return useMemo(() => inOrder(data, ids), [data, ids])
}

export function useDeckMeter(lang: string) {
	const statuses = useDeckStatuses(lang)
	const activeIds = useMemo(
		() => [...statuses].filter(([, s]) => s === 'active').map(([pid]) => pid),
		[statuses]
	)
	const phrases = usePhrasesByIds(activeIds)
	return useMemo(() => {
		const counts = new Map<string, number>()
		for (const phrase of phrases)
			for (const tag of phrase.tags)
				counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1)
		const tags = [...counts]
			.toSorted((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([name, count]) => ({ name, count }))
		return { size: activeIds.length, tags }
	}, [phrases, activeIds.length])
}
