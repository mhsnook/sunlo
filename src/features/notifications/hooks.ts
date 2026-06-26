import { useMutation } from '@tanstack/react-query'
import { isNull, useLiveQuery } from '@tanstack/react-db'
import type { UseLiveQueryResult } from '@/types/main'
import type { NotificationType } from './schemas'
import { notificationsCollection } from './collections'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'

export const useNotifications = (): UseLiveQueryResult<NotificationType[]> =>
	useLiveQuery((q) =>
		q
			.from({ notification: notificationsCollection })
			.orderBy(({ notification }) => notification.created_at, 'desc')
			.limit(100)
	)

export const useUnreadCount = (): number | undefined => {
	const { data } = useLiveQuery((q) =>
		q
			.from({ notification: notificationsCollection })
			.where(({ notification }) => isNull(notification.read_at))
	)
	if (!data) return undefined
	return data.length || undefined
}

export const markNotificationRead = (id: string) =>
	notificationsCollection.update(id, (draft) => {
		draft.read_at = new Date().toISOString()
	})

// Classic mutation: one bulk POST marks every unread row, vs the wrapper's
// per-row PATCH that collection.update over N rows would produce.
export const useMarkAllAsRead = () => {
	const userId = useUserId()
	return useMutation({
		mutationFn: async () => {
			const read_at = new Date().toISOString()
			await supabase
				.from('notification')
				.update({ read_at })
				.eq('uid', userId!)
				.is('read_at', null)
				.throwOnError()
		},
		onSuccess: () => {
			const read_at = new Date().toISOString()
			notificationsCollection.utils.writeBatch(() => {
				notificationsCollection.forEach((n) => {
					if (n.read_at === null)
						notificationsCollection.utils.writeUpdate({ id: n.id, read_at })
				})
			})
		},
	})
}
