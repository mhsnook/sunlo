import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { NotificationSchema, type NotificationType } from './schemas'
import { toastError } from '@/components/ui/sonner'
import { groupUpdatesByChanges } from '@/lib/collections/group-updates'
import { writeSyncedRows } from '@/lib/collections/synced-row'
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
		// Mark-all-as-read stamps one `read_at` across every unread row, so
		// grouping collapses it to a single request. Callers fire and forget,
		// so the error toast belongs here rather than at the call site.
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
							// The write-back is what `refetch: false` promises.
							writeSyncedRows(
								notificationsCollection,
								(data ?? []).map((row) => NotificationSchema.parse(row))
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
