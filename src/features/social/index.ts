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
} from './schemas'

// Collections
export {
	friendSummariesCollection,
	chatMessagesCollection,
} from './collections'

// Live collections
export { relationsFull, type RelationsFullType } from './live'

// Hooks
export {
	useRelationFriends,
	useOneRelation,
	useFriendRequestAction,
	useAllChats,
	useOneFriendChat,
	useUnreadMessages,
	useUnreadChatsCount,
	useMarkAsRead,
	useSocialRealtime,
} from './hooks'

export {
	useSearchProfilesByUsername,
	useOnePublicProfile,
} from './public-profile'
