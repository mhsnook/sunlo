import { createCollection } from '@tanstack/react-db'
import { queryCollectionOptions } from '@tanstack/query-db-collection'
import { NotificationSchema, type NotificationType } from './schemas'
import { notificationsQuery } from './queries'
import { queryClient } from '@/lib/query-client'

export { notificationsQuery }

export const notificationsCollection = createCollection(
	queryCollectionOptions({
		id: 'notifications',
		queryKey: notificationsQuery.queryKey,
		queryFn: notificationsQuery.queryFn!,
		getKey: (item: NotificationType) => item.id,
		queryClient,
		startSync: false,
		schema: NotificationSchema,
	})
)
