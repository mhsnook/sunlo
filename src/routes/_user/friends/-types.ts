import { Enums, Tables, TablesInsert } from '@/types/supabase'

export type uuid = string

export type ChatMessageRow = Tables<'chat_message'>
export type ChatMessageRelative = ChatMessageRow & {
	isMine: boolean
	friendUid: uuid
}
export type ChatMessageInsert = TablesInsert<'chat_message'>

export type RelationRow = Tables<'phrase_relation'>
export type RelationInsert = TablesInsert<'phrase_relation'>

export type FriendshipRow = {
	uid: uuid
	friend_uuid: uuid
	helping_with: Array<string>
	created_at: string
	updated_at: string
}

export type FriendSummary = Tables<'friend_summary'>
export type FriendRequestActionInsert = TablesInsert<'friend_request_action'>
export type FriendRequestActionRow = Tables<'friend_request_action'>
export type FriendSummaryRaw = FriendSummary & {
	profile_more: Tables<'public_profile'> | null
	profile_less: Tables<'public_profile'> | null
}

export type FriendSummaryRelative = {
	most_recent_action_type: Enums<'friend_request_response'>
	most_recent_created_at: string
	status: string
	uidOther: uuid
	isMostRecentByMe: boolean
	isMyUidMore: boolean
	profile?: PublicProfile
}

export type FriendSummaryFull = FriendSummaryRelative & {
	profile: PublicProfile
}

export type PublicProfile = Tables<'public_profile'> & {
	uid: uuid
}

export type PublicProfileFull = PublicProfile & {
	friend_summary?: FriendSummaryRelative
}
