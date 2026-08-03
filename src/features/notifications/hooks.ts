import { useEffect } from 'react'
import { isNull, useLiveQuery } from '@tanstack/react-db'
import type { UseLiveQueryResult, uuid } from '@/types/main'
import { NotificationSchema, type NotificationType } from './schemas'
import { notificationsCollection } from './collections'
import supabase from '@/lib/supabase-client'
import { useUserId } from '@/lib/use-auth'
import type { Tables } from '@/types/supabase'

export const useNotifications = (): UseLiveQueryResult<NotificationType[]> =>
	useLiveQuery((q) =>
		q
			.from({ notification: notificationsCollection })
			.orderBy(({ notification }) => notification.created_at, 'desc')
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

/**
 * Mark one notification read. Fire-and-forget: the row updates in this tick,
 * and `notificationsCollection.onUpdate` owns the error toast and the rollback.
 */
export const markNotificationRead = (id: uuid) => {
	notificationsCollection.update(id, (draft) => {
		draft.read_at = new Date().toISOString()
	})
}

/**
 * Mark every unread notification read in one transaction. The collection is
 * RLS-scoped to the signed-in user, so the loaded rows are that user's rows.
 */
export const markAllNotificationsRead = () => {
	const unreadIds = notificationsCollection.toArray
		.filter((notification) => notification.read_at === null)
		.map((notification) => notification.id)
	if (unreadIds.length === 0) return
	const read_at = new Date().toISOString()
	notificationsCollection.update(unreadIds, (drafts) => {
		drafts.forEach((draft) => {
			draft.read_at = read_at
		})
	})
}

export const useNotificationsRealtime = () => {
	const userId = useUserId()

	useEffect(() => {
		if (!userId) return

		const channel = supabase
			.channel('user-notifications')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notification',
					filter: `uid=eq.${userId}`,
				},
				(payload) => {
					const newNotification = payload.new as Tables<'notification'>
					notificationsCollection.utils.writeInsert(
						NotificationSchema.parse(newNotification)
					)
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [userId])
}
