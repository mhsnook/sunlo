import { queryOptions } from '@tanstack/react-query'
import { NotificationSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const notificationsQuery = queryOptions({
	queryKey: ['user', 'notification'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('notification')
			.select()
			.order('created_at', { ascending: false })
			.limit(100)
			.throwOnError()
		return data?.map((item) => NotificationSchema.parse(item)) ?? []
	},
})
