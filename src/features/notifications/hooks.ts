import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { isNull, useLiveQuery } from '@tanstack/react-db'
import type { UseLiveQueryResult } from '@/types/main'
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

export const useMarkAsRead = () =>
	useMutation({
		mutationFn: async (id: string) => {
			const read_at = new Date().toISOString()
			const { data } = await supabase
				.from('notification')
				.update({ read_at })
				.eq('id', id)
				.select()
				.throwOnError()
			return data[0]
		},
		onSuccess: (data) => {
			notificationsCollection.utils.writeUpdate(NotificationSchema.parse(data))
		},
	})

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
			notificationsCollection.utils.writeBatch(() => {
				notificationsCollection.forEach((notification) => {
					if (notification.read_at === null) {
						notificationsCollection.utils.writeUpdate({
							id: notification.id,
							read_at: new Date().toISOString(),
						})
					}
				})
			})
		},
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
