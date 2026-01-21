import { useEffect, useLayoutEffect, useRef } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { ListMusic, MessageCircleHeart, Plus, WalletCards } from 'lucide-react'

import type { PublicProfileType } from '@/lib/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
	markAsRead,
	useOneFriendChat,
	useOneRelation,
} from '@/hooks/use-friends'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { useUserId } from '@/lib/use-auth'
import { CardPreview } from '@/routes/_user/friends/-card-preview'
import { Loader } from '@/components/ui/loader'
import { Button, buttonVariants } from '@/components/ui/button'
import { ago } from '@/lib/dayjs'
import { RequestPreview } from '@/routes/_user/friends/-request-preview'
import { PlaylistPreview } from '@/routes/_user/friends/-playlist-preview'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
	// Track which messages we've already sent mark-as-read for
	const markedAsReadRef = useRef<Set<string>>(new Set())

	const messagesQuery = useOneFriendChat(friendUid)

	// Mark messages as read when viewing the chat
	useEffect(() => {
		if (!messagesQuery.data || !userId) return

		// Find unread messages we haven't already processed
		const unreadMsgs = messagesQuery.data.filter(
			(msg) =>
				msg.sender_uid === friendUid &&
				!msg.read_at &&
				!markedAsReadRef.current.has(msg.id)
		)

		if (unreadMsgs.length) {
			// Mark these as processed before sending request
			unreadMsgs.forEach((msg) => markedAsReadRef.current.add(msg.id))
			const read_at = new Date().toISOString()
			markAsRead({ friendUid, read_at })
		}
	}, [messagesQuery.data, friendUid, userId])

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

	if (!relation?.profile || messagesQuery.isLoading) {
		return (
			<Card className="flex h-full flex-col">
				<Loader />
			</Card>
		)
	}

	const relUsername = relation?.profile.username
	const relAvatarUrl = avatarUrlify(relation?.profile.avatar_path)

	return (
		<Card className="flex h-full flex-col">
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
			<CardContent className="min-h-0 flex-1 p-0">
				<ScrollArea className="h-full px-4">
					<div ref={messagesContainerRef} className="space-y-4 pt-4 pb-2">
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
												'align-end ms-auto justify-end ps-[10%]'
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
					<div className="flex items-center gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon" className="shrink-0">
									<Plus className="size-5" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-48">
								<DropdownMenuItem asChild>
									<Link
										to="/friends/chats/$friendUid/recommend"
										from={Route.fullPath}
										search={{ type: 'phrase' }}
										className="flex items-center gap-2"
									>
										<WalletCards className="size-4" />
										Phrase
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link
										to="/friends/chats/$friendUid/recommend"
										from={Route.fullPath}
										search={{ type: 'request' }}
										className="flex items-center gap-2"
									>
										<MessageCircleHeart className="size-4" />
										Request
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<Link
										to="/friends/chats/$friendUid/recommend"
										from={Route.fullPath}
										search={{ type: 'playlist' }}
										className="flex items-center gap-2"
									>
										<ListMusic className="size-4" />
										Playlist
									</Link>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Link
							to="/friends/chats/$friendUid/recommend"
							from={Route.fullPath}
							search={{ type: 'phrase' }}
							className="bg-muted text-muted-foreground flex h-10 flex-1 cursor-pointer items-center rounded-2xl px-4 text-sm"
						>
							Send a recommendation...
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
