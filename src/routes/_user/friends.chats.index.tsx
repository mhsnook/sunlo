import { createFileRoute } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'

export const Route = createFileRoute('/_user/friends/chats/')({
	component: ChatsIndex,
})

function ChatsIndex() {
	return (
		<div className="bg-muted/40 flex h-full flex-col items-center justify-center gap-4 rounded-xl text-center">
			<MessageSquare className="text-muted-foreground h-16 w-16" />
			<h3 className="text-2xl font-bold tracking-tight">
				Select a friend to start a conversation
			</h3>
			<p className="text-muted-foreground text-sm">
				You can send and receive phrase recommendations from your friends.
			</p>
		</div>
	)
}
