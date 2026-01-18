import { useLayoutEffect, useRef, useState } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Send } from 'lucide-react'

import type { PublicProfileType } from '@/lib/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useOneFriendChat, useOneRelation } from '@/hooks/use-friends'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { useUserId } from '@/lib/use-auth'
import { CardPreview } from '@/routes/_user/friends/-card-preview'
import { Loader } from '@/components/ui/loader'
import { buttonVariants } from '@/components/ui/button'
import { ago } from '@/lib/dayjs'
import { RequestPreview } from '@/routes/_user/friends/-request-preview'
import { PlaylistPreview } from '@/routes/_user/friends/-playlist-preview'

export const Route = createFileRoute('/_user/friends/chats/$friendUid')({
	component: ChatPage,
	beforeLoad: () => ({
		titleBar: {
			title: 'Chat',
		},
		appnav: [],
	}),
})

function ChatPage() {
	const { friendUid } = Route.useParams()
	const { data: relation } = useOneRelation(friendUid)
	const userId = useUserId()
	const bottomRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)
	const scrollAreaRef = useRef<HTMLDivElement>(null)
	const [isScrolledDown, setIsScrolledDown] = useState(false)

	const messagesQuery = useOneFriendChat(friendUid)

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

	// Track scroll position for shadow indicator
	useLayoutEffect(() => {
		const viewport = scrollAreaRef.current?.querySelector(
			'[data-radix-scroll-area-viewport]'
		)
		if (!viewport) return

		const handleScroll = () => {
			setIsScrolledDown(viewport.scrollTop > 20)
		}

		viewport.addEventListener('scroll', handleScroll)
		return () => viewport.removeEventListener('scroll', handleScroll)
	}, [])

	if (!relation?.profile || messagesQuery.isLoading) {
		return (
			<Card className="flex h-[calc(100vh-9rem-4px)] flex-col">
				<Loader />
			</Card>
		)
	}

	const relUsername = relation?.profile.username
	const relAvatarUrl = avatarUrlify(relation?.profile.avatar_path)

	return (
		<Card className="flex h-[calc(100vh-9rem-4px)] flex-col">
			<CardHeader className="flex flex-row items-center gap-4 border-b p-4">
				<Link to="/friends/$uid" params={{ uid: friendUid }}>
					<Avatar>
						<AvatarImage src={relAvatarUrl} alt={relUsername} />
						<AvatarFallback>
							{relUsername.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</Link>
				<div className="flex-1">
					<p className="font-semibold">{relUsername}</p>
					<p className="text-muted-foreground text-xs">
						{relation.status === 'friends' ? 'Friends' : 'Pending'}
					</p>
				</div>
			</CardHeader>
			<CardContent className="relative min-h-0 flex-1 overflow-hidden p-0">
				{/* Scroll shadow indicator */}
				<div
					className={cn(
						'pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-black/10 to-transparent transition-opacity duration-200',
						isScrolledDown ? 'opacity-100' : 'opacity-0'
					)}
				/>
				<ScrollArea ref={scrollAreaRef} className="h-full px-4">
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
											'max-w-[80%] items-start gap-2',
											isMine ?
												'align-end aps-[10%] ms-auto justify-end'
											:	'align-start me-auto justify-start pe-[10%]'
										)}
									>
										{!isMine && (
											<Avatar className="my-5 h-8 w-8">
												<AvatarImage src={relAvatarUrl} alt={relUsername} />
												<AvatarFallback>
													{relUsername.charAt(0).toUpperCase()}
												</AvatarFallback>
											</Avatar>
										)}
										<div>
											<p className="text-muted-foreground mx-0 mb-1 text-xs">
												{ago(msg.created_at)}
											</p>
											{msg.phrase_id && msg.lang && (
												<CardPreview pid={msg.phrase_id} isMine={isMine} />
											)}
											{msg.request_id && msg.lang && (
												<RequestPreview id={msg.request_id} />
											)}
											{msg.playlist_id && msg.lang && (
												<PlaylistPreview id={msg.playlist_id} />
											)}
											<div
												className={cn(
													'relative z-0 max-w-xs rounded-b-2xl p-3 lg:max-w-md',
													isMine ?
														'bg-primary ms-6 place-self-end text-white/70'
													:	'bg-muted me-6 place-self-start'
												)}
											>
												{msg.message_type === 'recommendation' && (
													<p className="text-sm italic">
														Sent a phrase recommendation.
													</p>
												)}
												{msg.message_type === 'request' && (
													<p className="text-sm italic">Requested a phrase.</p>
												)}
												{msg.message_type === 'accepted' && (
													<div className="text-sm italic">
														<p>
															{isMine ? 'You' : relUsername} added this to{' '}
															{isMine ? 'your' : 'their'} deck.
														</p>
													</div>
												)}
												{msg.message_type === 'playlist' && (
													<p className="text-sm italic">Shared a playlist.</p>
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
				{relation.status === 'friends' ?
					<div className="relative">
						<Link
							to="/friends/chats/$friendUid/recommend"
							from={Route.fullPath}
							className="flex items-center gap-2"
						>
							<Input
								placeholder="Send a phrase recommendation..."
								className="cursor-pointer"
							/>
							<span className={buttonVariants({ size: 'icon' })}>
								<Send className="h-4 w-4" />
							</span>
						</Link>
					</div>
				:	<p className="text-muted-foreground p-2 text-center italic">
						You must be friends to chat.
					</p>
				}
			</div>
			<Outlet />
		</Card>
	)
}

const EmptyChat = ({ profile }: { profile: PublicProfileType }) => (
	<div className="flex flex-col items-center justify-center gap-6 py-10">
		<p className="text-xl font-bold">{profile.username}</p>
		<div className="bg-muted-foreground/40 relative mx-auto flex size-32 items-center justify-center rounded-full text-4xl">
			{profile.avatar_path ?
				<img
					src={avatarUrlify(profile.avatar_path)}
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
				from={Route.fullPath}
				params={{ uid: profile.uid }}
			>
				View profile
			</Link>
		</p>
	</div>
)
