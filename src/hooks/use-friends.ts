import { useMutation } from '@tanstack/react-query'
import { toastError, toastNeutral, toastSuccess } from '@/components/ui/sonner'

import type { TablesInsert } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { ChatMessageRelType, ChatMessageType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import {
	and,
	createOptimisticAction,
	eq,
	isNull,
	useLiveQuery,
} from '@tanstack/react-db'
import { chatMessagesCollection } from '@/lib/collections'
import { mapArrays } from '@/lib/utils'
import { relationsFull, RelationsFullType } from '@/lib/live-collections'

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
			if (variable === 'invite') toastSuccess('Friend request sent 👍')
			//if (variable === 'accept')
			//	toastSuccess('Accepted invitation. You are now connected 👍')
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

// Hook to count unique friends with unread messages (for badge)
export const useUnreadChatsCount = (): number | undefined => {
	const { data: unreadMessages } = useUnreadMessages()
	if (!unreadMessages) return undefined
	// Count unique sender_uids (friends with unread messages)
	const uniqueSenders = new Set(unreadMessages.map((m) => m.sender_uid))
	return uniqueSenders.size || undefined
}

export const markAsRead = createOptimisticAction({
	onMutate: ({ friendUid, read_at }: { friendUid: uuid; read_at: string }) => {
		// Find all unread messages from this friend and update them optimistically
		chatMessagesCollection.forEach((message) => {
			if (message.sender_uid === friendUid && message.read_at === null) {
				chatMessagesCollection.utils.writeUpdate({ id: message.id, read_at })
			}
		})
	},
	mutationFn: async ({
		friendUid,
		read_at,
	}: {
		friendUid: uuid
		read_at: string
	}) => {
		await supabase
			.from('chat_message')
			.update({ read_at })
			.eq('sender_uid', friendUid)
			.is('read_at', null)
			.throwOnError()
	},
})
