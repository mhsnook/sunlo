import type { ChatMessageRow } from '@/types/main'
import { useEffect, useRef } from 'react'
import {
	createFileRoute,
	Outlet,
	useNavigate,
	useMatchRoute,
} from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import supabase from '@/lib/supabase-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOneRelation } from '@/lib/friends'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { CardPreview } from '@/components/chat/card-preview'

export const Route = createFileRoute('/_user/friends/chats/$friendId')({
	component: ChatPage,
})

function ChatPage() {
	const { friendId } = Route.useParams()
	const { data: relation } = useOneRelation(friendId)
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const navigate = useNavigate({ from: Route.fullPath })
	const matchRoute = useMatchRoute()

	const isRecommendRoute = !!matchRoute({
		to: '/friends/chats/$friendId/recommend',
		params: { friendId },
	})

	const messagesQuery = useQuery({
		queryKey: ['chats', friendId, 'messages'],
		queryFn: async () => {
			const { data, error } = await supabase
				.from('chat_message')
				.select('*')
				.or(
					`and(sender_uid.eq.${userId},recipient_uid.eq.${friendId}),and(sender_uid.eq.${friendId},recipient_uid.eq.${userId})`
				)
				.order('created_at', { ascending: true })

			if (error) throw error
			return data
		},
		enabled: !!userId && !!friendId,
	})

	useEffect(() => {
		if (!userId || !friendId) return

		// Sort UIDs to create a consistent channel name between two users
		const channelName = `chat-${[userId, friendId].sort().join('-')}`

		const channel = supabase
			.channel(channelName)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'chat_message',
					// RLS on the server ensures we only get messages for this user.
					// We also filter client-side to only update the current chat.
					// We'll filter client-side to only update the current chat.
				},
				(payload) => {
					const newMessage = payload.new as ChatMessageRow // Define ChatMessage type
					if (
						(newMessage.sender_uid === userId &&
							newMessage.recipient_uid === friendId) ||
						(newMessage.sender_uid === friendId &&
							newMessage.recipient_uid === userId)
					) {
						queryClient.setQueryData(
							['chats', friendId, 'messages'], // Use the same query key
							(oldData: ChatMessageRow[] | undefined) => {
								return oldData ? [...oldData, newMessage] : [newMessage]
							}
						)
					}
				}
			)
			.subscribe()

		return () => {
			void supabase.removeChannel(channel)
		}
	}, [friendId, userId, queryClient])

	useEffect(() => {
		// Scroll to bottom when new messages are added
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTo({
				top: scrollAreaRef.current.scrollHeight,
			})
		}
	}, [messagesQuery.data])

	if (!relation?.profile || messagesQuery.isPending) {
		return (
			<Card className="flex h-full flex-col">
				<CardHeader className="p-4">Loading chat...</CardHeader>
			</Card>
		)
	}

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="flex flex-row items-center gap-4 border-b p-4">
				<Avatar>
					<AvatarImage
						src={relation.profile.avatarUrl}
						alt={relation.profile.username}
					/>
					<AvatarFallback>
						{relation.profile.username.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="font-semibold">{relation.profile.username}</p>
					<p className="text-muted-foreground text-xs">
						{relation.status === 'friends' ? 'Friends' : 'Pending'}
					</p>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-0">
				<ScrollArea
					ref={scrollAreaRef}
					className="h-[calc(100vh-20rem-1px)] px-4"
				>
					<div className="space-y-4">
						{messagesQuery.data?.map((msg) => {
							const isMe = msg.sender_uid === userId
							return (
								<div
									key={msg.id}
									className={cn(
										'flex items-end gap-2',
										isMe ? 'justify-end' : 'justify-start'
									)}
								>
									{!isMe && (
										<Avatar className="h-8 w-8">
											<AvatarImage
												src={relation.profile?.avatarUrl}
												alt={relation.profile?.username}
											/>
											<AvatarFallback>
												{relation.profile?.username.charAt(0).toUpperCase()}
											</AvatarFallback>
										</Avatar>
									)}
									<div>
										{msg.phrase_id && (
											<CardPreview pid={msg.phrase_id} lang={msg.lang} />
										)}
										<div
											className={cn(
												'max-w-xs rounded-2xl p-3 lg:max-w-md',
												isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
											)}
										>
											{msg.message_type === 'recommendation' && (
												<p className="text-sm italic">
													Sent a phrase recommendation.
												</p>
											)}
											{msg.message_type === 'accepted' && (
												<div className="text-sm italic">
													<p>
														{isMe ? 'You' : relation.profile!.username} added
														this to {isMe ? 'your' : 'their'} deck.
													</p>
												</div>
											)}
										</div>
									</div>
								</div>
							)
						})}
					</div>
				</ScrollArea>
			</CardContent>
			<div className="border-t p-4">
				<div className="relative">
					<div className="flex items-center gap-2">
						<Input
							placeholder="Send a phrase recommendation..."
							className="cursor-pointer"
							onClick={() =>
								void navigate({
									to: '/friends/chats/$friendId/recommend',
									params: { friendId },
								})
							}
						/>
						<Button
							type="button"
							size="icon"
							onClick={() =>
								void navigate({
									to: '/friends/chats/$friendId/recommend',
									params: { friendId },
								})
							}
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</div>
			<Outlet />
		</Card>
	)
}
