import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import type { TablesInsert } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { ChatMessageRelType, ChatMessageType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { and, eq, isNull, or, useLiveQuery } from '@tanstack/react-db'
import { chatMessagesCollection } from '@/lib/collections'
import { mapArrays } from '@/lib/utils'
import { relationsFull, RelationsFullType } from '@/lib/live-collections'
import { ChatMessageSchema } from '@/lib/schemas'

export const useRelationInvitations = (): UseLiveQueryResult<
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

export const useRelationInvitedByMes = (): UseLiveQueryResult<
	RelationsFullType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ relation: relationsFull })
			.where(({ relation }) =>
				and(
					eq(relation.status, 'pending'),
					eq(relation.most_recent_uid_for, relation.uid)
				)
			)
	)
}

export const useRelationFriends = (): UseLiveQueryResult<
	RelationsFullType[]
> => {
	return useLiveQuery((q) =>
		q
			.from({ relation: relationsFull })
			.where(({ relation }) => eq(relation.status, 'friends'))
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
			if (variable === 'invite') toast.success('Friend request sent 👍')
			//if (variable === 'accept')
			//	toast.success('Accepted invitation. You are now connected 👍')
			if (variable === 'decline') toast('Declined this invitation')
			if (variable === 'cancel') toast('Cancelled this invitation')
			if (variable === 'remove') toast('You are no longer friends')
		},
		onError: (error, variables) => {
			console.log(
				`Something went wrong trying to modify your relationship:`,
				error,
				variables
			)
			toast.error(`Something went wrong with this interaction`)
		},
	})
}

type ChatsMap = {
	[key: uuid]: Array<ChatMessageRelType & { friendUid: uuid; isByMe: boolean }>
}

export const useAllChats = (): UseLiveQueryResult<ChatsMap> => {
	const userId = useUserId()
	const initialQuery = useLiveQuery((q) =>
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
			}))
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
	// Debug: Log all messages in collection to see what we're filtering from
	const allMessages = chatMessagesCollection.state
	const matchingSender = Array.from(allMessages.values()).filter(
		(m) => m.sender_uid === uid
	)
	const matchingRecipient = Array.from(allMessages.values()).filter(
		(m) => m.recipient_uid === uid
	)
	console.log(
		`useOneFriendChat debug: friend=${uid}, collection has ${allMessages.size} messages, ${matchingSender.length} where friend is sender, ${matchingRecipient.length} where friend is recipient`
	)

	const result = useLiveQuery(
		(q) =>
			q
				.from({ message: chatMessagesCollection })
				.where(({ message }) =>
					or(eq(message.sender_uid, uid), eq(message.recipient_uid, uid))
				)
				.orderBy(({ message }) => message.created_at, 'asc')
				.fn.select(({ message }) => ({
					...message,
					friendUid:
						message.sender_uid === userId ?
							message.recipient_uid
						:	message.sender_uid,
					isByMe: message.sender_uid === userId,
				})),
		[uid]
	)
	// Debug: log what the live query returns
	console.log(
		`useOneFriendChat result: ${result.data?.length ?? 0} messages returned by live query`
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

// Hook to count unique friends with unread messages (for badge)
export const useUnreadChatsCount = (): number | undefined => {
	const { data: unreadMessages } = useUnreadMessages()
	if (!unreadMessages) return undefined
	// Count unique sender_uids (friends with unread messages)
	const uniqueSenders = new Set(unreadMessages.map((m) => m.sender_uid))
	return uniqueSenders.size || undefined
}

// Mutation to mark all messages from a friend as read
export const useMarkChatAsRead = () => {
	const userId = useUserId()
	return useMutation({
		mutationKey: ['user', 'chat_message', 'mark_read'],
		mutationFn: async (friendUid: uuid) => {
			// Call the RPC directly with type assertion since types aren't generated yet
			const { error } = await supabase.rpc(
				'mark_chat_as_read' as 'are_friends',
				{ friend_uid: friendUid } as unknown as { uid1: string; uid2: string }
			)
			if (error) throw error
		},
		onSuccess: (_, friendUid) => {
			// Update local collection with read_at timestamps
			const now = new Date().toISOString()
			const messages = chatMessagesCollection.state
			messages.forEach((message: ChatMessageType) => {
				if (
					message.sender_uid === friendUid &&
					message.recipient_uid === userId &&
					!message.read_at
				) {
					chatMessagesCollection.utils.writeUpdate(
						ChatMessageSchema.parse({ ...message, read_at: now })
					)
				}
			})
		},
		onError: (error) => {
			console.log('Error marking chat as read', error)
		},
	})
}
