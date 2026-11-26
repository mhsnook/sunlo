import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { inArray, useLiveQuery } from '@tanstack/react-db'
import { useFlueAgent } from '@flue/react'
import { createFlueClient } from '@flue/sdk'
import { toastError } from '@/components/ui/sonner'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { addPhrasesToDeck, saveDeckIntention } from '@/features/deck/mutations'
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
import { useAuth } from '@/lib/use-auth'
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
import { addNote, clearNotes, pendingNotes } from './store'

function useNavTarget(lang: string, guest: boolean) {
	const navigate = useNavigate()
	return useCallback(
		(target: NavigateTarget) => {
			const id = target.id ?? ''
			// Review and profile show a guest the sign-up form themselves.
			const search = guest ? { signup: 'coach' as const } : {}
			switch (target.to) {
				case 'deck':
					return void navigate({
						to: '/learn/$lang',
						params: { lang },
						search,
					})
				case 'review':
					return void navigate({ to: '/learn/$lang/review', params: { lang } })
				case 'profile':
					return void navigate({ to: '/profile' })
				case 'requests':
					return void navigate({
						to: '/learn/$lang/requests',
						params: { lang },
						search,
					})
				case 'phrase':
					return void navigate({
						to: '/learn/$lang/phrases/$id',
						params: { lang, id },
						search,
					})
				case 'playlist':
					return void navigate({
						to: '/learn/$lang/playlists/$playlistId',
						params: { lang, playlistId: id },
						search,
					})
				case 'request':
					return void navigate({
						to: '/learn/$lang/requests/$id',
						params: { lang, id },
						search,
					})
			}
		},
		[navigate, lang, guest]
	)
}

const bearer = async () => ({
	authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ''}`,
})

async function signInAnonymously() {
	const { error } = await supabase.auth.signInAnonymously()
	if (error) throw error
}

/**
 * The coach for one language page. A visitor without an account has no uid
 * and no conversation: the chat offers them to log in or continue as a guest
 * (`guest.join`, an anonymous sign-in) before they can send.
 */
export function useCoach(lang: string, uid: string | null, deck: DeckMeter) {
	const { data: profile } = useProfile()
	const { isAnonymous } = useAuth()
	const translationLang = usePreferredTranslationLang(lang)
	const navigateTo = useNavTarget(lang, isAnonymous)
	const learnerName = profile?.username ?? null
	// The page's own state is per language; the conversation spans them all.
	const pageKey = `${uid ?? 'visitor'}:${lang}`

	// The SDK calls `headers` on every request and reconnect, so a refreshed
	// Supabase token is picked up without a new client.
	const client = useMemo(
		() =>
			uid
				? createFlueClient({
						url: new URL(
							`${COACH_MOUNT}/${coachConversationId(uid)}`,
							window.location.origin
						).href,
						headers: bearer,
					})
				: undefined,
		[uid]
	)
	const agent = useFlueAgent({ client })
	const [joining, setJoining] = useState(false)
	const conversation = useMemo(
		() => readConversation(agent.messages, lang),
		[agent.messages, lang]
	)
	// Until the history loads, an empty conversation may only mean "not read
	// yet", so the page must not greet the learner as new.
	const ready = !uid || agent.historyReady
	const started = agent.messages.length > 0

	// Read when the turn ends, not when it started: the learner may have added
	// phrases from the page while the coach was working.
	const deckStatuses = () =>
		statusesFromCards(cardsCollection.toArray.filter((c) => c.lang === lang))

	const addToDeck = async (owner: string, phraseIds: Array<string>) => {
		const statuses = deckStatuses()
		const phrases = phraseIds.flatMap((id) => {
			const status = statuses.get(id)
			const phrase = phrasesFull.get(id)
			return phrase &&
				phrase.lang === lang &&
				status !== 'active' &&
				status !== 'learned'
				? [phrase]
				: []
		})
		if (!phrases.length)
			return addNote(pageKey, 'those phrases were already in the deck')
		await addPhrasesToDeck(lang, owner, phrases)
		addNote(pageKey, `added ${phrases.length} phrases`)
	}

	// The agent cannot read the deck, so its searches do not leave out what the
	// learner already has. The page tells it on the next message.
	const noteOverlap = (shownIds: Array<string>) => {
		if (!shownIds.length) return
		const statuses = deckStatuses()
		const inDeck = shownIds.filter((id) => statuses.has(id)).length
		if (inDeck)
			addNote(
				pageKey,
				inDeck === shownIds.length
					? `all ${inDeck} phrases you just showed were already in the deck`
					: `${inDeck} of the ${shownIds.length} phrases you just showed ${inDeck === 1 ? 'was' : 'were'} already in the deck`
			)
	}

	const send = async (text: string) => {
		if (!uid || !client) return
		const opening = started ? null : openingLine(learnerName, lang, deck.size)
		const notes = pendingNotes(pageKey)
		try {
			const receipt = await agent.sendMessage(
				composeMessage(text, {
					context: { lang, translationLang, learnerName, guest: isAnonymous },
					notes: notes.map((note) => note.text),
					deck: deckLine(deck, decksCollection.get(lang)?.intention ?? null),
					opening,
				})
			)
			clearNotes(
				pageKey,
				notes.map((note) => note.id)
			)
			await client.wait(receipt)
			// One turn is a handful of messages; the newest twenty hold it.
			const { messages } = await client.history({ limit: 20 })
			const actions = pageActions(messages, receipt.submissionId)
			if (actions.intention) {
				await saveDeckIntention(
					actions.intention.lang,
					uid,
					actions.intention.intention
				)
				addNote(pageKey, 'saved what you want to learn on your deck')
			}
			if (actions.add.length) await addToDeck(uid, actions.add)
			noteOverlap(actions.shown)
			if (actions.navigate) navigateTo(actions.navigate)
		} catch (err) {
			console.error('coach: message failed', err)
			toastError(err instanceof Error ? err.message : "The coach didn't answer")
		}
	}

	const joinAsGuest = async () => {
		setJoining(true)
		try {
			await signInAnonymously()
		} catch (err) {
			console.error('coach: anonymous sign-in failed', err)
			toastError(
				err instanceof Error ? err.message : "Couldn't start your coach"
			)
		} finally {
			setJoining(false)
		}
	}

	return {
		pageKey,
		send,
		guest: uid ? null : { joining, join: () => void joinAsGuest() },
		translationLang,
		learnerName,
		started,
		ready,
		busy: agent.status === 'submitted' || agent.status === 'streaming',
		...conversation,
		offersAccount: isAnonymous && conversation.offersAccount,
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
