import { ChatsSidebar } from '@/components/friends/chats-sidebar'
import { TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MessagesSquare } from 'lucide-react'

export const Route = createFileRoute('/_user/friends/chats')({
	component: ChatsLayout,
	loader: () => ({
		titleBar: {
			title: `Chats`,
			Icon: MessagesSquare,
		} as TitleBar,
		SecondSidebar: ChatsSidebar,
	}),
})

function ChatsLayout() {
	return <Outlet />
}
