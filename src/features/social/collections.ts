import { createCollection, BTreeIndex } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	FriendSummarySchema,
	type FriendSummaryType,
	ChatMessageSchema,
	type ChatMessageType,
} from './schemas'
import { toastError } from '@/components/ui/sonner'
import { groupUpdatesByChanges } from '@/lib/collections/group-updates'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import type { TablesUpdate } from '@/types/supabase'

export const friendSummariesCollection = createCollection(
	queryCollectionOptions({
		id: 'friends',
		queryKey: ['user', 'friend_summary'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
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
		defaultIndexType: BTreeIndex,
	})
)

export const chatMessagesCollection = createCollection(
	queryCollectionOptions({
		id: 'chat_messages',
		queryKey: ['user', 'chat_message'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
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
		// Read receipts stamp one `read_at` across every unread message from a
		// friend, so grouping collapses the batch to a single request. The
		// reader never waits on it, so the error toast belongs here.
		onUpdate: async ({ transaction }) => {
			try {
				await Promise.all(
					groupUpdatesByChanges(transaction.mutations).map(
						async ({ changes, keys }) => {
							const { data } = await supabase
								.from('chat_message')
								.update(changes as TablesUpdate<'chat_message'>)
								.in('id', keys)
								.select()
								.throwOnError()
							// The write-back is what `refetch: false` promises.
							for (const row of data ?? [])
								chatMessagesCollection.utils.writeUpdate(
									ChatMessageSchema.parse(row)
								)
						}
					)
				)
				return { refetch: false }
			} catch (error) {
				toastError('Could not update your messages')
				throw error
			}
		},
	})
)
