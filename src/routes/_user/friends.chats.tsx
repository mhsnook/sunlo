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
	return (
		<div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4">
			<div className="flex h-full flex-col">
				<Outlet />
			</div>
		</div>
	)
}
