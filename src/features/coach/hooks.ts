import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { inArray, useLiveQuery } from '@tanstack/react-db'
import { useFlueAgent } from '@flue/react'
import { createFlueClient } from '@flue/sdk'
import { toastError } from '@/components/ui/sonner'
import { addPhrasesToDeck } from '@/features/deck/mutations'
import {
	useDeckCards,
	usePreferredTranslationLang,
} from '@/features/deck/hooks'
import { phrasesFull } from '@/features/phrases/live'
import { phrasePlaylistsActive } from '@/features/playlists/live'
import { useProfile } from '@/features/profile/hooks'
import {
	commentPhraseLinksActive,
	phraseRequestsActive,
} from '@/features/requests/live'
import supabase from '@/lib/supabase-client'
import {
	composeMessage,
	deckLine,
	openingLine,
	pageActions,
	readConversation,
} from './conversation'
import {
	activeIds,
	answerPhraseIds,
	countTags,
	statusesFromCards,
} from './library'
import {
	COACH_MOUNT,
	coachConversationId,
	type NavigateTarget,
} from './protocol'
import { addNote, takeNotes, useCoachThread } from './store'

function useNavTarget(lang: string) {
	const navigate = useNavigate()
	return useCallback(
		(target: NavigateTarget) => {
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

const bearer = async () => ({
	authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
})

export function useCoach(lang: string, uid: string, deck: DeckMeter) {
	const { data: profile } = useProfile()
	const translationLang = usePreferredTranslationLang(lang)
	const navigateTo = useNavTarget(lang)
	const learnerName = profile?.username ?? null
	const thread = useCoachThread(uid, lang)
	const key = coachConversationId(lang, uid, thread)

	// The SDK calls `headers` on every request and reconnect, so a refreshed
	// Supabase token is picked up without a new client.
	const client = useMemo(
		() =>
			createFlueClient({
				url: new URL(`${COACH_MOUNT}/${key}`, window.location.origin).href,
				headers: bearer,
			}),
		[key]
	)
	const agent = useFlueAgent({ client })
	const conversation = useMemo(
		() => readConversation(agent.messages),
		[agent.messages]
	)

	const addToDeck = async (phraseIds: Array<string>) => {
		const phrases = phraseIds
			.filter((id) => deck.statuses.get(id) !== 'active')
			.flatMap((id) => {
				const phrase = phrasesFull.get(id)
				return phrase && phrase.lang === lang ? [phrase] : []
			})
		if (!phrases.length)
			return addNote(key, 'those phrases were already in the deck')
		await addPhrasesToDeck(lang, uid, phrases)
		addNote(key, `added ${phrases.length} phrases`)
	}

	const send = async (text: string) => {
		const opening = agent.messages.length
			? null
			: openingLine(learnerName, lang, deck.size)
		try {
			const receipt = await agent.sendMessage(
				composeMessage(text, {
					notes: takeNotes(key),
					deck: deckLine(deck),
					opening,
				}),
				{ initialData: { lang, translationLang, learnerName } }
			)
			await client.wait(receipt)
			const { messages } = await client.history()
			const actions = pageActions(messages, receipt.submissionId)
			if (actions.add.length) await addToDeck(actions.add)
			if (actions.navigate) navigateTo(actions.navigate)
		} catch (err) {
			console.error('coach: message failed', err)
			toastError(err instanceof Error ? err.message : "The coach didn't answer")
		}
	}

	return {
		key,
		send,
		translationLang,
		learnerName,
		started: agent.messages.length > 0,
		ready: agent.historyReady,
		busy: agent.status === 'submitted' || agent.status === 'streaming',
		...conversation,
	}
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
				answerIds: answerPhraseIds(request.id, links ?? []),
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
	const { data: cards } = useDeckCards(lang)
	const statuses = useMemo(() => statusesFromCards(cards ?? []), [cards])
	const active = useMemo(() => activeIds(statuses), [statuses])
	const phrases = usePhrasesByIds(active)
	const tags = useMemo(() => countTags(phrases).slice(0, 3), [phrases])
	return { size: active.length, tags, statuses }
}

export type DeckMeter = ReturnType<typeof useDeckMeter>
