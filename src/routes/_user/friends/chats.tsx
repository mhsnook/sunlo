import { createFileRoute } from '@tanstack/react-router'
import { ChatsSidebar } from './-chats-sidebar'
import { chatMessagesCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/friends/chats')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Chats',
		},
	}),
	loader: async ({ context }) => {
		// Only preload if authenticated to ensure RLS works correctly
		if (context.auth.isAuth) {
			await chatMessagesCollection.preload()
		}
		return {
			SecondSidebar: ChatsSidebar,
		}
	},
})
