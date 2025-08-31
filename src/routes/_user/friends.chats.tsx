import { ChatsSidebar } from '@/components/friends/chats-sidebar'
import { TitleBar } from '@/types/main'
import { createFileRoute } from '@tanstack/react-router'
import { MessagesSquare } from 'lucide-react'

export const Route = createFileRoute('/_user/friends/chats')({
	loader: () => ({
		titleBar: {
			title: `Chats`,
			Icon: MessagesSquare,
		} as TitleBar,
		SecondSidebar: ChatsSidebar,
	}),
})
