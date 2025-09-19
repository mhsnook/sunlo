import { ChatsSidebar } from '@/components/friends/chats-sidebar'
import { TitleBar } from '@/types/main'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/friends/chats')({
	loader: () => ({
		titleBar: {
			title: `Chats`,
		} as TitleBar,
		SecondSidebar: ChatsSidebar,
	}),
})
