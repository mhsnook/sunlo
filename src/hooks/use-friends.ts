import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import type { TablesInsert } from '@/types/supabase'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import type { ChatMessageRelType } from '@/lib/schemas'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import { and, eq, or, useLiveQuery } from '@tanstack/react-db'
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
	return useLiveQuery(
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
}

type UnreadCountsMap = { [key: uuid]: number }

export const useUnreadCounts = (): UseLiveQueryResult<UnreadCountsMap> => {
	const userId = useUserId()
	const initialQuery = useLiveQuery((q) =>
		q
			.from({ message: chatMessagesCollection })
			.where(({ message }) =>
				and(eq(message.recipient_uid, userId), eq(message.is_read, false))
			)
	)

	return {
		...initialQuery,
		data:
			!initialQuery.data ? undefined : (
				initialQuery.data.reduce<UnreadCountsMap>((acc, msg) => {
					acc[msg.sender_uid] = (acc[msg.sender_uid] ?? 0) + 1
					return acc
				}, {})
			),
	}
}

export const useMarkMessagesAsRead = (friendUid: uuid) => {
	const userId = useUserId()

	return useMutation({
		mutationKey: ['user', userId, 'chat_message', 'mark_read', friendUid],
		mutationFn: async () => {
			const { data } = await supabase
				.from('chat_message')
				.update({ is_read: true })
				.eq('recipient_uid', userId!)
				.eq('sender_uid', friendUid)
				.eq('is_read', false)
				.select()
				.throwOnError()
			return data
		},
		onSuccess: (data) => {
			if (data) {
				data.forEach((msg) => {
					chatMessagesCollection.utils.writeUpdate({
						id: msg.id,
						is_read: true,
					})
				})
			}
		},
		onError: (error) => {
			console.log('Error marking messages as read', error)
		},
	})
}
