import { createCollection, BTreeIndex } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
} from './schemas'
import { friendSummariesQuery, chatMessagesQuery } from './queries'
import { queryClient } from '@/lib/query-client'

export { friendSummariesQuery, chatMessagesQuery }

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		id: 'friends',
		queryKey: friendSummariesQuery.queryKey,
		queryFn: friendSummariesQuery.queryFn!,
		getKey: (item: FriendSummaryType) => `${item.uid_less}--${item.uid_more}`,
		queryClient,
		startSync: false,
		schema: FriendSummarySchema,
		autoIndex: 'eager',
		defaultIndexType: BTreeIndex,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		id: 'chat_messages',
		queryKey: chatMessagesQuery.queryKey,
		queryFn: chatMessagesQuery.queryFn!,
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		startSync: false,
		schema: ChatMessageSchema,
	})
)
