import { createFileRoute } from '@tanstack/react-router'
import { chatMessagesQuery } from '@/features/social/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/friends/chats')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Chats',
		},
		wideContent: true,
		fixedHeight: true,
	}),
	loader: async ({ context }) => {
		// Only preload if authenticated to ensure RLS works correctly
		if (context.auth.isAuth) {
			await queryClient.ensureQueryData(chatMessagesQuery)
		}
	},
})
