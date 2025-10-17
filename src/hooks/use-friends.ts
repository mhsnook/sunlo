import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { FriendRequestActionInsert, uuid } from '@/routes/_user/friends/-types'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { and, eq, or, useLiveQuery } from '@tanstack/react-db'
import {
	chatMessagesCollection,
	friendSummariesCollection,
	publicProfilesCollection,
} from '@/lib/collections'
import { useMemo } from 'react'
import { mapArrays } from '@/lib/utils'
import { ChatMessageRelative } from '@/lib/schemas'

export const useRelations = () => {
	return useLiveQuery((q) =>
		q
			.from({ relation: friendSummariesCollection })
			.join(
				{ profile: publicProfilesCollection },
				({ relation, profile }) => eq(relation.uid, profile.uid),
				'inner'
			)
			.fn.select(({ relation, profile }) => ({
				...relation,
				isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
				profile,
			}))
	)
}

export const useRelationInvitations = () => {
	return useLiveQuery((q) =>
		q
			.from({ relation: friendSummariesCollection })
			.where(({ relation }) =>
				and(
					eq(relation.status, 'pending'),
					eq(relation.most_recent_uid_by, relation.uid)
				)
			)
			.join(
				{ profile: publicProfilesCollection },
				({ relation, profile }) => eq(relation.uid, profile.uid),
				'inner'
			)
			.select(({ relation, profile }) => ({
				...relation,
				isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
				profile,
			}))
	)
}

export const useRelationInvitedByMes = () => {
	return useLiveQuery((q) =>
		q
			.from({ relation: friendSummariesCollection })
			.where(({ relation }) =>
				and(
					eq(relation.status, 'pending'),
					eq(relation.most_recent_uid_for, relation.uid)
				)
			)
			.join(
				{ profile: publicProfilesCollection },
				({ relation, profile }) => eq(relation.uid, profile.uid),
				'inner'
			)
			.fn.select(({ relation, profile }) => ({
				...relation,
				isMostRecentByMe: relation.most_recent_uid_for === relation.uid,
				profile,
			}))
	)
}

export const useRelationFriends = () => {
	return useLiveQuery((q) =>
		q
			.from({ relation: friendSummariesCollection })
			.where(({ relation }) => eq(relation.status, 'friends'))
			.join(
				{ profile: publicProfilesCollection },
				({ relation, profile }) => eq(relation.uid, profile.uid),
				'inner'
			)
			.fn.select(({ relation, profile }) => ({
				...relation,
				isMostRecentByMe: relation.most_recent_uid_by !== relation.uid,
				profile,
			}))
	)
}
export const useOneRelation = (uid: uuid) =>
	useLiveQuery(
		(q) =>
			q
				.from({ relation: friendSummariesCollection })
				.where(({ relation }) => eq(relation.uid, uid))
				.findOne()
				.join(
					{ profile: publicProfilesCollection },
					({ relation, profile }) => eq(relation.uid, profile.uid),
					'inner'
				)
				.fn.select(({ relation, profile }) => ({
					...relation,
					isMostRecentByMe: relation.most_recent_uid_by !== uid,
					profile,
				})),
		[uid]
	)

export const useFriendRequestAction = (uid_for: uuid) => {
	const { userId: uid_by } = useAuth()
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
				} as FriendRequestActionInsert)
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

export type ChatsMap = {
	[key: uuid]: Array<ChatMessageRelative>
}

export const useAllChats = () => {
	const { userId } = useAuth()
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

	return useMemo(
		() => ({
			...initialQuery,
			data:
				!initialQuery.data ? null : (
					mapArrays<ChatMessageRelative, 'friendUid'>(
						initialQuery.data,
						'friendUid'
					)
				),
		}),
		[initialQuery]
	)
}

export const useOneFriendChat = (uid: uuid) => {
	const { userId } = useAuth()
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
