import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ChatsSidebar } from '@/components/friends/chats-sidebar'
import { ChatMessageRelative, ChatMessageRow, TitleBar } from '@/types/main'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { MessagesSquare } from 'lucide-react'
import supabase from '@/lib/supabase-client'
import { useAuth } from '@/lib/hooks'
import { ChatsMap } from '@/lib/friends'

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
	const { userId } = useAuth()
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!userId) return

		const channel = supabase
			.channel('user-chats')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_message',
				},
				(payload) => {
					const newMessage = payload.new as ChatMessageRow

					queryClient.setQueryData(
						['user', userId, 'chats'],
						(oldData: ChatsMap | undefined): ChatsMap => {
							const friendId =
								newMessage.sender_uid === userId ?
									newMessage.recipient_uid
								:	newMessage.sender_uid

							const newChatMessageRelative: ChatMessageRelative = {
								...newMessage,
								isMine: newMessage.sender_uid === userId,
								friendId: friendId,
							}

							const currentChats = oldData ?? {}
							const friendChatHistory = currentChats[friendId] ?? []

							return {
								...currentChats,
								[friendId]: [...friendChatHistory, newChatMessageRelative],
							}
						}
					)
				}
			)
			.subscribe()
		return () => {
			void supabase.removeChannel(channel)
		}
	}, [userId, queryClient])
	return <Outlet />
}
