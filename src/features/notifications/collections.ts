import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { NotificationSchema, type NotificationType } from './schemas'
import { queryClient } from '@/lib/query-client'
import supabase from '@/lib/supabase-client'

export const notificationsCollection = createCollection(
	queryCollectionOptions({
		id: 'notifications',
		queryKey: ['user', 'notification'],
		queryFn: async () => {
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
	})
)
