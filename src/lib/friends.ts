import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from '@tanstack/react-query'
import supabase from './supabase-client'
import {
	FriendRequestActionInsert,
	FriendSummaryRaw,
	FriendSummaryRelative,
	uuid,
} from '@/types/main'
import { useAuth } from './hooks'
import { avatarUrlify, mapArray } from './utils'
import toast from 'react-hot-toast'

type FriendSummariesLoaded = {
	relationsMap: { [key: uuid]: FriendSummaryRelative }
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
			avatarUrl: avatarUrlify(pro.avatar_path),
		}
	}
	return res
}

export const relationsQuery = (uidMe: uuid | null) =>
	queryOptions({
		queryKey: ['user', uidMe ?? '', 'relations'],
		queryFn: async ({ queryKey }: { queryKey: Array<string> }) => {
			if (!queryKey[1]) return null
			const uid = queryKey[1]
			const { data } = await supabase
				.from('friend_summary')
				.select(
					'*, profile_less:public_profile!friend_request_action_uid_less_fkey(*), profile_more:public_profile!friend_request_action_uid_more_fkey(*)'
				)
				.or(`uid_less.eq.${uid},uid_more.eq.${uid}`)
				.throwOnError()

			if (!data) return null

			const cleanArray: Array<FriendSummaryRelative> = data.map((d) =>
				friendSummaryToRelative(uid, d)
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

const oneRelationQuery = (uidMe: uuid, uidOther: uuid) =>
	queryOptions({
		...relationsQuery(uidMe),
		select: (data) => (!data ? null : data.relationsMap[uidOther]),
	})

export const useRelations = () => {
	const { userId } = useAuth()
	return useQuery({ ...relationsQuery(userId) })
}

export const useOneRelation = (uidToUse: uuid) => {
	const { userId } = useAuth()
	return useQuery({ ...oneRelationQuery(userId, uidToUse) })
}

export const useFriendRequestAction = (uid_for: uuid) => {
	const { userId: uid_by } = useAuth()
	const [uid_less, uid_more] = [uid_by, uid_for].sort()
	const queryClient = useQueryClient()

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
			if (variable === 'accept')
				toast.success('Accepted invitation. You are now connected 👍')
			if (variable === 'decline') toast('Declined this invitation')
			if (variable === 'cancel') toast('Cancelled this invitation')
			if (variable === 'remove') toast('You are no longer friends')
			void queryClient.invalidateQueries({
				queryKey: ['user', uid_by, 'relations'],
			})
			void queryClient.invalidateQueries({
				queryKey: ['public_profile', 'search'],
			})
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
