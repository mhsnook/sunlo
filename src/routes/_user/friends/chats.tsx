import { createFileRoute } from '@tanstack/react-router'
import { ChatsSidebar } from './-chats-sidebar'
import { TitleBar } from '@/types/main'
import { chatMessagesCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/friends/chats')({
	loader: async () => {
		await chatMessagesCollection.preload()
		return {
			titleBar: {
				title: `Chats`,
			} as TitleBar,
			SecondSidebar: ChatsSidebar,
		}
	},
})
