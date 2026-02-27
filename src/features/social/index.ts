// Feature: social — Friends, chat, public profiles
// Public API for the social domain

// Schemas & types
export {
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
	type ChatMessageRelType,
	FriendRequestResponseEnumSchema,
	FriendStatusEnumSchema,
	MessageTypeEnumSchema,
} from '@/lib/schemas/social'

// Collections
export {
	friendSummariesCollection,
	chatMessagesCollection,
} from '@/lib/collections/social'

// Live collections
export {
	relationsFull,
	type RelationsFullType,
} from '@/lib/collections/live-social'

// Hooks
export {
	useRelationInvitations,
	useRelationInvitedByMes,
	useRelationFriends,
	useOneRelation,
	useFriendRequestAction,
	useAllChats,
	useOneFriendChat,
	useUnreadMessages,
	useUnreadChatsCount,
	useMarkAsRead,
} from '@/hooks/use-friends'

export {
	useSearchProfilesByUsername,
	useOnePublicProfile,
} from '@/hooks/use-public-profile'
