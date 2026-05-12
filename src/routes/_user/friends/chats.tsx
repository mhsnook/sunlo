import { createFileRoute } from '@tanstack/react-router'
import { chatMessagesCollection } from '@/features/social/collections'

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
			await chatMessagesCollection.preload()
		}
	},
})
