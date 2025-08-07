import type { ChatMessageRow, PublicProfileFull } from '@/types/main'
import { useEffect, useLayoutEffect, useRef } from 'react'
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import supabase from '@/lib/supabase-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOneFriendChat, useOneRelation } from '@/lib/friends'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { CardPreview } from '@/components/chat/card-preview'
import { Loader } from '@/components/ui/loader'
import { buttonVariants } from '@/components/ui/button-variants'

export const Route = createFileRoute('/_user/friends/chats/$friendId')({
	component: ChatPage,
})

function ChatPage() {
	const { friendId } = Route.useParams()
	const { data: relation } = useOneRelation(friendId)
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const bottomRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const navigate = useNavigate({ from: Route.fullPath })

	const messagesQuery = useOneFriendChat(friendId)

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

	useLayoutEffect(() => {
		const container = messagesContainerRef.current
		if (!container) return

		const scrollToBottom = () => {
			bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
		}

		// Scroll when new messages are added, or when content resizes (e.g. images load)
		const resizeObserver = new ResizeObserver(scrollToBottom)
		resizeObserver.observe(container)

		// Initial scroll
		scrollToBottom()
		return () => resizeObserver.disconnect()
	}, [messagesQuery.data])

	if (!relation?.profile || messagesQuery.isPending) {
		return (
			<Card className="flex h-full flex-col">
				<Loader />
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
				<ScrollArea className="h-[calc(100vh-20rem-1px)] px-4">
					<div ref={messagesContainerRef} className="space-y-4 pt-4">
						{!messagesQuery.data?.length ?
							<EmptyChat profile={relation.profile} />
						:	messagesQuery.data?.map((msg) => {
								if (typeof msg === 'undefined') return null
								const isMine = msg.sender_uid === userId
								return (
									<div
										key={msg.id}
										className={cn(
											'flex items-end gap-2',
											isMine ? 'justify-end' : 'justify-start'
										)}
									>
										{!isMine && (
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
											{msg.phrase_id && msg.lang && (
												<CardPreview
													pid={msg.phrase_id}
													lang={msg.lang}
													isMine={isMine}
												/>
											)}
											<div
												className={cn(
													'relative z-0 max-w-xs rounded-b-2xl p-3 lg:max-w-md',
													isMine ?
														'bg-primary text-primary-foreground ms-6'
													:	'bg-muted me-6'
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
															{isMine ? 'You' : relation.profile!.username}{' '}
															added this to {isMine ? 'your' : 'their'} deck.
														</p>
													</div>
												)}
											</div>
										</div>
									</div>
								)
							})
						}
					</div>
					<div ref={bottomRef} />
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

const EmptyChat = ({ profile }: { profile: PublicProfileFull }) => (
	<div className="flex flex-col items-center justify-center gap-6 py-10">
		<p className="text-xl font-bold">{profile.username}</p>
		<div className="bg-muted-foreground/40 relative mx-auto flex size-32 items-center justify-center rounded-full text-4xl">
			{profile.avatarUrl ?
				<img
					src={profile.avatarUrl}
					alt={`${profile.username ? `${profile.username}'s` : 'Your'} avatar`}
					className="size-32 rounded-full object-cover"
				/>
			:	<span className="absolute top-0 right-0 bottom-0 left-0 flex size-32 items-center justify-center font-bold capitalize">
					{(profile.username ?? '').slice(0, 2)}
				</span>
			}
		</div>
		<p>
			<Link
				className={buttonVariants({ variant: 'secondary' })}
				to="/friends/$uid"
				params={{ uid: profile.uid }}
			>
				View profile
			</Link>
		</p>
	</div>
)
