import { queryOptions } from '@tanstack/react-query'
import { FriendSummarySchema, ChatMessageSchema } from './schemas'
import supabase from '@/lib/supabase-client'

export const friendSummariesQuery = queryOptions({
	queryKey: ['user', 'friend_summary'] as const,
	queryFn: async () => {
		const { data } = await supabase
			.from('friend_summary')
			.select()
			.throwOnError()
		return data?.map((item) => FriendSummarySchema.parse(item)) ?? []
	},
})

export const chatMessagesQuery = queryOptions({
	queryKey: ['user', 'chat_message'] as const,
	queryFn: async () => {
		const { data } = await supabase.from('chat_message').select().throwOnError()
		return data?.map((item) => ChatMessageSchema.parse(item)) ?? []
	},
})
