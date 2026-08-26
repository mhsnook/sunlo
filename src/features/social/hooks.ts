import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'

import type { Tables } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	ChatMessageSchema,
	FriendRequestActionSchema,
	type ChatMessageRelType,
	type ChatMessageType,
	type FriendRequestActionType,
	type FriendRequestResponseType,
} from './schemas'
import { writeSyncedRow } from '@/lib/collections/realtime-row'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import {
	chatMessagesCollection,
	friendRequestActionsCollection,
} from './collections'
import { mapArrays } from '@/lib/utils'
import { relationsFull, type RelationsFullType } from './live'

export const useRelationFriends = (): UseLiveQueryResult<
	RelationsFullType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ relation: relationsFull })
			.where(({ relation }) => eq(relation.status, 'friends'))
	)
}

export const useIncomingFriendRequests = (): UseLiveQueryResult<
	RelationsFullType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ relation: relationsFull })
			.where(({ relation }) =>
				and(
					eq(relation.status, 'pending'),
					eq(relation.most_recent_uid_by, relation.uid)
				)
			)
	)
}

export const useOneRelation = (
	uid: uuid
): UseLiveQueryResult<RelationsFullType> =>
	useLiveQuery(
		(q) =>
			q
				.from({ relation: relationsFull })
				.where(({ relation }) => eq(relation.uid, uid))
				.findOne(),
		[uid]
	)

/** What each action tells the person who took it, once the server stores it. */
export const FRIEND_ACTION_TOAST: Record<
	FriendRequestResponseType,
	{ text: string; tone: 'success' | 'neutral' }
> = {
	invite: { text: 'Friend request sent 👍', tone: 'success' },
	accept: {
		text: 'Accepted invitation. You are now connected 👍',
		tone: 'success',
	},
	decline: { text: 'Declined this invitation', tone: 'neutral' },
	cancel: { text: 'Cancelled this invitation', tone: 'neutral' },
	remove: { text: 'You are no longer friends', tone: 'neutral' },
}

/** What `useFriendRequestAction` hands back to a button. */
export type FriendRequestAction = {
	act: (action_type: FriendRequestResponseType) => void
	isPending: boolean
	/** The last action the server stored, for a call site showing an outcome. */
	lastAction: FriendRequestResponseType | null
	error: Error | null
}

type ActionState = Omit<FriendRequestAction, 'act'> & { uid_for: uuid }

/** Nothing has been tried yet for this person. */
const NO_ACTION_YET = {
	isPending: false,
	lastAction: null,
	error: null,
} satisfies Omit<ActionState, 'uid_for'>

/**
 * Record one friend request action, and wait for the server to store it.
 *
 * The write is deliberately not optimistic. `validate_friend_request_action`
 * rejects several transitions, and a relationship that reads "friends" for a
 * moment and then reads "unconnected" again is a worse thing to show than a
 * button that waits and then reports the error. `onInsert` writes the stored
 * row into the synced layer, so the relationship changes once, when it is real.
 */
export const useFriendRequestAction = (uid_for: uuid): FriendRequestAction => {
	const uid_by = useUserId()
	// Scoped to `uid_for` so navigating from one profile to another does not
	// show the previous person's outcome — this component stays mounted.
	const [state, setState] = useState<ActionState>({
		uid_for,
		...NO_ACTION_YET,
	})
	const current: ActionState =
		state.uid_for === uid_for ? state : { uid_for, ...NO_ACTION_YET }

	const act = (action_type: FriendRequestResponseType) => {
		if (!uid_by || current.isPending) return
		const [uid_less, uid_more] = [uid_by, uid_for].toSorted()
		const id = crypto.randomUUID()
		setState({ uid_for, isPending: true, lastAction: null, error: null })
		// `collection.insert` validates against the collection's schema, so the
		// object only needs to satisfy the type here. `created_at` is required by
		// that schema and dropped by the handler — the server stamps it.
		const tx = friendRequestActionsCollection.insert(
			{
				id,
				created_at: new Date().toISOString(),
				uid_less,
				uid_more,
				uid_by,
				uid_for,
				action_type,
			} satisfies FriendRequestActionType,
			{ optimistic: false }
		)
		tx.isPersisted.promise.then(
			() => {
				// Report what the server settled on, not what we asked for: an
				// invite to someone who already invited you is stored as an accept.
				const settled =
					friendRequestActionsCollection.get(id)?.action_type ?? action_type
				setState({
					uid_for,
					isPending: false,
					lastAction: settled,
					error: null,
				})
				const toast = FRIEND_ACTION_TOAST[settled]
				if (toast.tone === 'success') toastSuccess(toast.text)
				else toastNeutral(toast.text)
			},
			(caught: unknown) => {
				const failure =
					caught instanceof Error ? caught : new Error(String(caught))
				console.log(
					`Something went wrong trying to modify your relationship:`,
					failure,
					action_type
				)
				setState({
					uid_for,
					isPending: false,
					lastAction: null,
					error: failure,
				})
				toastError(`Something went wrong with this interaction`)
			}
		)
	}

	return {
		act,
		isPending: current.isPending,
		lastAction: current.lastAction,
		error: current.error,
	}
}

type ChatsMap = {
	[key: uuid]: Array<ChatMessageRelType & { friendUid: uuid; isByMe: boolean }>
}

export const useAllChats = (): UseLiveQueryResult<ChatsMap> => {
	const userId = useUserId()
	const initialQuery = useLiveQuery(
		(q) =>
			q
				.from({ message: chatMessagesCollection })
				.orderBy(({ message }) => message.created_at, 'asc')
				.fn.select(({ message }) => ({
					...message,
					friendUid:
						message.sender_uid === userId
							? message.recipient_uid
							: message.sender_uid,
					isByMe: message.sender_uid === userId,
				})),
		[userId]
	)

	return {
		...initialQuery,
		data: !initialQuery.data
			? undefined
			: mapArrays<ChatMessageRelType, 'friendUid'>(
					initialQuery.data,
					'friendUid'
				),
	}
}

export const useOneFriendChat = (
	uid: uuid
): UseLiveQueryResult<ChatMessageRelType[]> => {
	const userId = useUserId()

	const result = useLiveQuery(
		(q) =>
			q
				.from({ message: chatMessagesCollection })
				// Use .fn.where() for custom JS filter since or(eq(), eq()) wasn't matching correctly
				.fn.where(({ message }) => {
					return message.sender_uid === uid || message.recipient_uid === uid
				})
				.orderBy(({ message }) => message.created_at, 'asc')
				.fn.select(({ message }) => ({
					...message,
					friendUid:
						message.sender_uid === userId
							? message.recipient_uid
							: message.sender_uid,
					isByMe: message.sender_uid === userId,
				})),
		[uid, userId]
	)
	return result
}

// Hook to get unread messages (messages sent to the current user that haven't been read)
export const useUnreadMessages = (): UseLiveQueryResult<ChatMessageType[]> => {
	const userId = useUserId()
	return useLiveQuery(
		(q) =>
			q
				.from({ message: chatMessagesCollection })
				.where(({ message }) =>
					and(eq(message.recipient_uid, userId), isNull(message.read_at))
				),
		[userId]
	)
}

/** One canonical list for the chats sidebar: unique by uid, sorted unread-first. */
export type ChatEntry = {
	uid: uuid
	profile: RelationsFullType['profile']
	status: 'friends' | 'pending'
	unreadCount: number
	hasPendingRequest: boolean
	oldestUnread: ChatMessageType | null
	mostRecentMessage: ChatMessageRelType | null
	mostRecentActivity: string
}

export const useChatEntries = (): {
	data: Array<ChatEntry> | undefined
	isLoading: boolean
} => {
	const { data: friends, isLoading: isLoadingFriends } = useRelationFriends()
	const { data: incomingRequests, isLoading: isLoadingRequests } =
		useIncomingFriendRequests()
	const { data: chats, isLoading: isLoadingChats } = useAllChats()
	const { data: unreadMessages } = useUnreadMessages()

	const isLoading =
		!!isLoadingFriends || !!isLoadingRequests || !!isLoadingChats

	if (!friends && !incomingRequests) return { data: undefined, isLoading }

	// Build unread-message maps keyed by sender uid
	const unreadCountByUid = new Map<string, number>()
	const oldestUnreadByUid = new Map<string, ChatMessageType>()
	unreadMessages?.forEach((msg) => {
		unreadCountByUid.set(
			msg.sender_uid,
			(unreadCountByUid.get(msg.sender_uid) ?? 0) + 1
		)
		const existing = oldestUnreadByUid.get(msg.sender_uid)
		if (!existing || msg.created_at < existing.created_at)
			oldestUnreadByUid.set(msg.sender_uid, msg)
	})

	// Collect uids we've already added
	const seen = new Set<string>()
	const entries: Array<ChatEntry> = []

	// Incoming requests first (they may also be in friends if status just changed)
	incomingRequests?.forEach((req) => {
		seen.add(req.uid)
		entries.push({
			uid: req.uid,
			profile: req.profile,
			status: 'pending',
			unreadCount: unreadCountByUid.get(req.uid) ?? 0,
			hasPendingRequest: true,
			oldestUnread: oldestUnreadByUid.get(req.uid) ?? null,
			mostRecentMessage: chats?.[req.uid]?.at(-1) ?? null,
			mostRecentActivity: req.most_recent_created_at,
		})
	})

	// Then friends (skip any already added as pending)
	friends?.forEach((friend) => {
		if (seen.has(friend.uid)) return
		seen.add(friend.uid)
		const lastMsg = chats?.[friend.uid]?.at(-1) ?? null
		entries.push({
			uid: friend.uid,
			profile: friend.profile,
			status: 'friends',
			unreadCount: unreadCountByUid.get(friend.uid) ?? 0,
			hasPendingRequest: false,
			oldestUnread: oldestUnreadByUid.get(friend.uid) ?? null,
			mostRecentMessage: lastMsg,
			mostRecentActivity: lastMsg?.created_at ?? friend.most_recent_created_at,
		})
	})

	// Sort: unread/pending first, then by most recent activity
	entries.sort((a, b) => {
		const aHot = a.unreadCount > 0 || a.hasPendingRequest
		const bHot = b.unreadCount > 0 || b.hasPendingRequest
		if (aHot && !bHot) return -1
		if (bHot && !aHot) return 1
		return a.mostRecentActivity < b.mostRecentActivity ? 1 : -1
	})

	return { data: entries, isLoading }
}

// Badge count: unique people with any unread activity
export const useUnreadChatsCount = (): number | undefined => {
	const { data: entries } = useChatEntries()
	if (!entries) return undefined
	const count = entries.filter(
		(e) => e.unreadCount > 0 || e.hasPendingRequest
	).length
	return count || undefined
}

/**
 * Mark every unread message from one friend read. Fire-and-forget: the rows
 * update in this tick, and `chatMessagesCollection.onUpdate` owns the error
 * toast and the rollback.
 */
export const markChatRead = ({
	friendUid,
	recipientUid,
	read_at,
}: {
	friendUid: uuid
	recipientUid: uuid
	read_at: string
}) => {
	const unreadIds = chatMessagesCollection.toArray
		.filter(
			(message) =>
				message.sender_uid === friendUid &&
				message.recipient_uid === recipientUid &&
				message.read_at === null
		)
		.map((message) => message.id)
	if (unreadIds.length === 0) return
	chatMessagesCollection.update(unreadIds, (drafts) => {
		drafts.forEach((draft) => {
			draft.read_at = read_at
		})
	})
}

/** What can be shared into a chat with friends, by message_type + its FK. */
export type ShareableContent =
	| { message_type: 'recommendation'; phrase_id: uuid }
	| { message_type: 'request'; request_id: uuid }
	| { message_type: 'playlist'; playlist_id: uuid }

const SHARE_SUCCESS_TOAST: Record<ShareableContent['message_type'], string> = {
	recommendation: 'Phrase sent to friend',
	request: 'Request sent to friend',
	playlist: 'Playlist sent to friend',
}

/**
 * Send a phrase / request / playlist to one or more friends as a chat message.
 * Shared by the three "send in chat" surfaces — they differ only in the
 * `message_type` + foreign key carried in `content`.
 */
export const useSendToFriends = (
	lang: string,
	content: ShareableContent,
	{ onSuccess }: { onSuccess?: () => void } = {}
) => {
	const userId = useUserId()
	return useMutation({
		mutationKey: ['send-to-friend', lang, content],
		mutationFn: async (friendUids: uuid[]) => {
			if (!userId) throw new Error('User not logged in')
			const inserts = friendUids.map((recipient_uid) => ({
				sender_uid: userId,
				recipient_uid,
				lang,
				...content,
			}))
			const { data } = await supabase
				.from('chat_message')
				.insert(inserts)
				.throwOnError()
			return data
		},
		onSuccess: () => {
			onSuccess?.()
			toastSuccess(SHARE_SUCCESS_TOAST[content.message_type])
		},
		onError: () => toastError('Something went wrong'),
	})
}

/** Subscribe to realtime friend-request and chat-message events. */
export const useSocialRealtime = () => {
	const userId = useUserId()

	useEffect(() => {
		if (!userId) return

		const friendRequestChannel = supabase
			.channel('friend-request-action-realtime')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'friend_request_action',
				},
				(payload) => {
					const row = FriendRequestActionSchema.parse(payload.new)
					if (row.action_type === 'accept' && row.uid_for === userId)
						toastSuccess('Friend request accepted')
					if (row.action_type === 'accept' && row.uid_by === userId)
						toastSuccess('You are now connected')
					writeSyncedRow(friendRequestActionsCollection, row.id, row)
				}
			)
			.subscribe()

		// UPDATE lands a friend's read receipt live. No DELETE binding: chat
		// messages are never deleted, and delete frames are not RLS-scoped —
		// see docs/mutations.md before subscribing to one.
		const chatChannel = supabase
			.channel('user-chats')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_message',
				},
				(payload) => {
					const row = ChatMessageSchema.parse(
						payload.new as Tables<'chat_message'>
					)
					writeSyncedRow(chatMessagesCollection, row.id, row)
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'chat_message',
				},
				(payload) => {
					const row = ChatMessageSchema.parse(
						payload.new as Tables<'chat_message'>
					)
					writeSyncedRow(chatMessagesCollection, row.id, row)
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(friendRequestChannel)
			void supabase.removeChannel(chatChannel)
		}
	}, [userId])
}
