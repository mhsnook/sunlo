import { createFileRoute } from '@tanstack/react-router'
import { ChatsSidebar } from './-chats-sidebar'
import { chatMessagesCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/friends/chats')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Chats',
		},
	}),
	loader: async () => {
		await chatMessagesCollection.preload()
		// In SPA mode, we can pass components through loader data
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return { SecondSidebar: ChatsSidebar } as any
	},
})
