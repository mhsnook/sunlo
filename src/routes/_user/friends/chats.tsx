import { createFileRoute } from '@tanstack/react-router'
import { ChatsSidebar } from './-chats-sidebar'
import { TitleBar } from '@/types/main'

export const Route = createFileRoute('/_user/friends/chats')({
	loader: () => ({
		titleBar: {
			title: `Chats`,
		} as TitleBar,
		SecondSidebar: ChatsSidebar,
	}),
})
