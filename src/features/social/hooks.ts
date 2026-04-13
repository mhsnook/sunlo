import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'

import type { Tables, TablesInsert } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import {
	ChatMessageSchema,
	type ChatMessageRelType,
	type ChatMessageType,
} from './schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { and, eq, isNull, useLiveQuery } from '@tanstack/react-db'
import {
	chatMessagesCollection,
	friendSummariesCollection,
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

export const useFriendRequestAction = (uid_for: uuid) => {
	const uid_by = useUserId()
	const [uid_less, uid_more] = [uid_by, uid_for].toSorted()

	return useMutation({
		mutationKey: ['user', uid_by, 'friend_request_action', uid_for],
		mutationFn: async (action_type: string) => {
			await supabase
				.from('friend_request_action')
				.insert({
					uid_less,
					uid_more,
					uid_by,
					uid_for,
					action_type,
				} as TablesInsert<'friend_request_action'>)
				.throwOnError()
		},
		onSuccess: (_, variable) => {
			if (variable === 'invite') toastSuccess('Friend request sent 👍')
			if (variable === 'accept')
				toastSuccess('Accepted invitation. You are now connected 👍')
			if (variable === 'decline') toastNeutral('Declined this invitation')
			if (variable === 'cancel') toastNeutral('Cancelled this invitation')
			if (variable === 'remove') toastNeutral('You are no longer friends')
		},
		onError: (error, variables) => {
			console.log(
				`Something went wrong trying to modify your relationship:`,
				error,
				variables
			)
			toastError(`Something went wrong with this interaction`)
		},
	})
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
						message.sender_uid === userId ?
							message.recipient_uid
						:	message.sender_uid,
					isByMe: message.sender_uid === userId,
				})),
		[userId]
	)

	return {
		...initialQuery,
		data:
			!initialQuery.data ? undefined : (
				mapArrays<ChatMessageRelType, 'friendUid'>(
					initialQuery.data,
					'friendUid'
				)
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
						message.sender_uid === userId ?
							message.recipient_uid
						:	message.sender_uid,
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

export const useMarkAsRead = () => {
	return useMutation({
		mutationFn: async ({
			friendUid,
			recipientUid,
			read_at,
		}: {
			friendUid: uuid
			recipientUid: uuid
			read_at: string
		}) => {
			await supabase
				.from('chat_message')
				.update({ read_at })
				.eq('sender_uid', friendUid)
				.eq('recipient_uid', recipientUid)
				.is('read_at', null)
				.throwOnError()
		},
		onMutate: ({ friendUid, recipientUid, read_at }) => {
			// Optimistically update all unread messages from this friend
			chatMessagesCollection.utils.writeBatch(() => {
				chatMessagesCollection.forEach((message) => {
					if (
						message.sender_uid === friendUid &&
						message.recipient_uid === recipientUid &&
						message.read_at === null
					) {
						chatMessagesCollection.utils.writeUpdate({
							id: message.id,
							read_at,
						})
					}
				})
			})
		},
		/*
		onSettled: async () => {
			// Sync the data back after success or failure
			await chatMessagesCollection.utils.refetch()
		},
		*/
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
					const newAction = payload.new as Tables<'friend_request_action'>
					if (
						newAction.action_type === 'accept' &&
						newAction.uid_for === userId
					)
						toastSuccess('Friend request accepted')
					if (newAction.action_type === 'accept' && newAction.uid_by === userId)
						toastSuccess('You are now connected')
					void friendSummariesCollection.utils.refetch()
				}
			)
			.subscribe()

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
					const newMessage = payload.new as Tables<'chat_message'>
					console.log(`new chat`, newMessage)
					chatMessagesCollection.utils.writeInsert(
						ChatMessageSchema.parse(newMessage)
					)
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(friendRequestChannel)
			void supabase.removeChannel(chatChannel)
		}
	}, [userId])
}
