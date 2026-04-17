import { createCollection, BasicIndex } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
} from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		id: 'friends',
		queryKey: ['user', 'friend_summary'],
		queryFn: async () => {
			console.log(`Loading friendSummariesCollection`)
			const { data } = await supabase
				.from('friend_summary')
				.select()
				.throwOnError()
			return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
		},
		getKey: (item: FriendSummaryType) => `${item.uid_less}--${item.uid_more}`,
		queryClient,
		startSync: false,
		schema: FriendSummarySchema,
		autoIndex: 'eager',
		defaultIndexType: BasicIndex,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		id: 'chat_messages',
		queryKey: ['user', 'chat_message'],
		queryFn: async () => {
			console.log(`Loading chatMessagesCollection`)
			const { data } = await supabase
				.from('chat_message')
				.select()
				.throwOnError()
			return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
		},
		getKey: (item: ChatMessageType) => item.id,
		queryClient,
		startSync: false,
		schema: ChatMessageSchema,
	})
)
