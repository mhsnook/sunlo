// Feature: social — Friends, chat, public profiles
// Public API for the social domain

// Schemas & types
export {
	FriendSummarySchema,
	type FriendSummaryType,
	FriendRequestActionSchema,
	type FriendRequestActionType,
	type FriendRequestResponseType,
	ChatMessageSchema,
	type ChatMessageType,
	type ChatMessageRelType,
	FriendRequestResponseEnumSchema,
	FriendStatusEnumSchema,
	MessageTypeEnumSchema,
} from './schemas'

// Collections
export {
	friendRequestActionsCollection,
	chatMessagesCollection,
} from './collections'

// Live collections — the friend-summary fold over the action log
export { friendSummaries, relationsFull, type RelationsFullType } from './live'

// Hooks
export {
	useRelationFriends,
	useIncomingFriendRequests,
	useOneRelation,
	useFriendRequestAction,
	type FriendRequestAction,
	useAllChats,
	useOneFriendChat,
	useUnreadMessages,
	useUnreadChatsCount,
	useChatEntries,
	type ChatEntry,
	markChatRead,
	useSendToFriends,
	sendToFriends,
	SHARE_SUCCESS_TOAST,
	type ShareableContent,
	useSocialRealtime,
} from './hooks'

export {
	useSearchProfilesByUsername,
	useOnePublicProfile,
} from './public-profile'
