import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { NotificationSchema, type NotificationType } from './schemas'
import { toastError } from '@/components/ui/sonner'
import { groupUpdatesByChanges } from '@/lib/collections/group-updates'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'
import type { TablesUpdate } from '@/types/supabase'

export const notificationsCollection = createCollection(
	queryCollectionOptions({
		id: 'notifications',
		queryKey: ['user', 'notification'],
		queryFn: async () => {
			if (!(await supabase.auth.getSession()).data?.session) return []
			console.log(`Loading notificationsCollection`)
			const { data } = await supabase
				.from('notification')
				.select()
				.order('created_at', { ascending: false })
				.limit(100)
				.throwOnError()
			return data?.map((item) => NotificationSchema.parse(item)) ?? []
		},
		getKey: (item: NotificationType) => item.id,
		queryClient,
		startSync: false,
		schema: NotificationSchema,
		// Marking read is the only update. Mark-all-as-read stamps every unread
		// row with one `read_at`, so grouping collapses it to a single request.
		// Callers fire and forget, which is why the error toast lives here.
		onUpdate: async ({ transaction }) => {
			try {
				await Promise.all(
					groupUpdatesByChanges(transaction.mutations).map(
						async ({ changes, keys }) => {
							const { data } = await supabase
								.from('notification')
								.update(changes as TablesUpdate<'notification'>)
								.in('id', keys)
								.select()
								.throwOnError()
							// `refetch: false` leaves the synced layer holding whatever the
							// last fetch returned, and the optimistic value disappears with
							// the transaction. Write the confirmed rows down so the two
							// layers agree — otherwise a refetch that lands mid-flight
							// carries stale rows and the update reverts on completion.
							for (const row of data ?? [])
								notificationsCollection.utils.writeUpdate(
									NotificationSchema.parse(row)
								)
						}
					)
				)
				return { refetch: false }
			} catch (error) {
				toastError('Could not update your notifications')
				throw error
			}
		},
	})
)
