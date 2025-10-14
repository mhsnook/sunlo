import { useCallback } from 'react'
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import {
	ChatMessageRelative,
	ChatMessageRow,
	FriendRequestActionInsert,
	FriendSummaryFull,
	FriendSummaryRaw,
	FriendSummaryRelative,
	uuid,
} from '@/routes/_user/friends/-types'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { mapArray, mapArrays } from '@/lib/utils'

type FriendSummariesLoaded = {
	relationsMap: { [key: uuid]: FriendSummaryFull }
	uids: {
		all: Array<uuid>
		friends: Array<uuid>
		invited: Array<uuid>
		invitations: Array<uuid>
	}
}

export const friendSummaryToRelative = (
	uid: uuid,
	d: FriendSummaryRaw
): FriendSummaryRelative => {
	let res: FriendSummaryRelative = {
		most_recent_action_type: d.most_recent_action_type!,
		most_recent_created_at: d.most_recent_created_at!,
		status: d.status!,
		uidOther: uid === d.uid_less ? d.uid_more! : d.uid_less!,
		isMostRecentByMe: uid === d.most_recent_uid_by,
		isMyUidMore: uid === d.uid_more,
	}

	if (d.profile_less && d.profile_more) {
		const pro = d.profile_less.uid === uid ? d.profile_more : d.profile_less
		res.profile = {
			uid: pro.uid ?? '',
			username: pro.username ?? '',
			avatar_path: pro.avatar_path ?? '',
		}
	}
	return res
}

export const relationsQuery = (uidMe: uuid) =>
	queryOptions({
		queryKey: ['user', uidMe, 'relations'],
		queryFn: async () => {
			const { data } = await supabase
				.from('friend_summary')
				.select(
					'*, profile_less:public_profile!friend_request_action_uid_less_fkey(*), profile_more:public_profile!friend_request_action_uid_more_fkey(*)'
				)
				.or(`uid_less.eq.${uidMe},uid_more.eq.${uidMe}`)
				.throwOnError()

			if (!data) return null

			const cleanArray = data
				.map((d) => friendSummaryToRelative(uidMe, d))
				.filter(
					(d: FriendSummaryRelative): d is FriendSummaryFull =>
						d.profile !== undefined
				)

			return {
				relationsMap: mapArray(cleanArray, 'uidOther'),
				uids: {
					all: cleanArray.map((d) => d.uidOther),
					friends: cleanArray
						.filter((d) => d.status === 'friends')
						.map((d) => d.uidOther),
					invited: cleanArray
						.filter((d) => d.status === 'pending' && d.isMostRecentByMe)
						.map((d) => d.uidOther),
					invitations: cleanArray
						.filter((d) => d.status === 'pending' && !d.isMostRecentByMe)
						.map((d) => d.uidOther),
				},
			} as FriendSummariesLoaded
		},
		enabled: !!uidMe,
	})

export const useRelations = () => {
	const { userId } = useAuth()
	return useQuery({ ...relationsQuery(userId!), enabled: !!userId })
}

export const useOneRelation = (uidToUse: uuid) => {
	const { userId } = useAuth()
	const selectRelation = useCallback(
		(data: FriendSummariesLoaded | null) =>
			data?.relationsMap[uidToUse] ?? null,
		[uidToUse]
	)
	return useQuery({
		...relationsQuery(userId!),
		select: selectRelation,
		enabled: !!userId,
	})
}

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

const chatsQueryOptions = (uid: uuid) =>
	queryOptions({
		queryKey: ['user', uid ?? '', 'chats'],
		queryFn: async () => {
			const { data } = await supabase
				.from('chat_message')
				.select('*')
				.order('created_at', { ascending: true })
				.throwOnError()
			const chatsRelative = data.map(
				(message: ChatMessageRow): ChatMessageRelative => ({
					...message,
					isMine: message.sender_uid === uid,
					friendId:
						message.sender_uid === uid ?
							message.recipient_uid
						:	message.sender_uid,
				})
			)
			const chatsMap: ChatsMap = mapArrays<ChatMessageRelative, 'friendId'>(
				chatsRelative,
				'friendId'
			)
			// console.log(`fetched chatsMap`, chatsMap)
			return chatsMap
		},
	})

export const useAllChats = () => {
	const { userId } = useAuth()
	return useQuery({
		...chatsQueryOptions(userId!),
		enabled: !!userId,
	})
}

export const useOneFriendChat = (friendId: uuid) => {
	const { userId } = useAuth()
	const selectChat = useCallback((data: ChatsMap) => data[friendId], [friendId])
	return useQuery({
		...chatsQueryOptions(userId!),
		select: selectChat,
		enabled: !!userId && !!friendId,
	})
}
