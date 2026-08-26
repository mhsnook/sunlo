import { createCollection, BTreeIndex } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import {
	FriendRequestActionSchema,
	type FriendRequestActionType,
	ChatMessageSchema,
	type ChatMessageType,
} from './schemas'
import { should } from '@scenetest/checks/react'
import { toastError } from '@/components/ui/sonner'
import { groupUpdatesByChanges } from '@/lib/collections/group-updates'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import type { TablesUpdate } from '@/types/supabase'

export const friendRequestActionsCollection = createCollection(
	queryCollectionOptions({
		id: 'friend_request_actions',
		queryKey: ['user', 'friend_request_action'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading friendRequestActionsCollection`)
			const { data } = await supabase
				.from('friend_request_action')
				.select()
				.throwOnError()
			return data?.map((item) => FriendRequestActionSchema.parse(item)) ?? []
		},
		getKey: (item: FriendRequestActionType) => item.id,
		queryClient,
		startSync: false,
		schema: FriendRequestActionSchema,
		autoIndex: 'eager',
		defaultIndexType: BTreeIndex,
		// Append-only: an action is a fact about a moment, so nothing updates or
		// deletes one. The relationship's current state is the fold in `live.ts`.
		onInsert: async ({ transaction }) => {
			const submitted = transaction.mutations.map(
				(m) => m.modified as FriendRequestActionType
			)
			const { data } = await supabase
				.from('friend_request_action')
				// `created_at` is the server's to stamp — it orders the log, and a
				// skewed client clock would reorder someone's friendships.
				.insert(submitted.map(({ created_at: _created_at, ...row }) => row))
				.select()
				.throwOnError()
			const rows =
				data?.map((row) => FriendRequestActionSchema.parse(row)) ?? []
			// `validate_friend_request_action` rewrites one action before storing
			// it: an invite to someone who already invited you is mutual consent,
			// so it lands as an accept. Every other action is stored as sent, and
			// an invalid one raises instead, which throws out of this handler.
			should(
				'friend_request_action insert returned each row as sent, or an invite the server accepted',
				rows.length === submitted.length &&
					submitted.every((sent) => {
						const row = rows.find((r) => r.id === sent.id)
						return (
							!!row &&
							(row.action_type === sent.action_type ||
								(sent.action_type === 'invite' && row.action_type === 'accept'))
						)
					}),
				{ submitted, returned: rows }
			)
			// The write-back is what `refetch: false` promises — and here it is
			// also the only thing that puts the row in the collection, because
			// `useFriendRequestAction` writes with `{ optimistic: false }`.
			// Upsert, not insert: this row's own realtime frame can land before
			// the insert resolves, in which case the key is already here.
			for (const row of rows)
				friendRequestActionsCollection.utils.writeUpsert(row)
			return { refetch: false }
		},
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
		// reader doesn't wait on it, so the error toast belongs here.
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
