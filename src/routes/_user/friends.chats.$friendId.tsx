import type { PublicProfileFull } from '@/types/main'
import { useLayoutEffect, useRef } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Send } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { useOneFriendChat, useOneRelation } from '@/hooks/use-friends'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { CardPreview } from '@/components/chat/card-preview'
import { Loader } from '@/components/ui/loader'
import { buttonVariants } from '@/components/ui/button-variants'
import { ago } from '@/lib/dayjs'
import { RequestPreview } from '@/components/chat/request-preview'

export const Route = createFileRoute('/_user/friends/chats/$friendId')({
	component: ChatPage,
})

function ChatPage() {
	const { friendId } = Route.useParams()
	const { data: relation } = useOneRelation(friendId)
	const { userId } = useAuth()
	const bottomRef = useRef<HTMLDivElement>(null)
	const messagesContainerRef = useRef<HTMLDivElement>(null)

	const messagesQuery = useOneFriendChat(friendId)

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

	const relUsername = relation?.profile.username ?? ''
	const relAvatarUrl = relation?.profile.avatarUrl ?? ''

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="flex flex-row items-center gap-4 border-b p-4">
				<Avatar>
					<AvatarImage src={relAvatarUrl} alt={relUsername} />
					<AvatarFallback>{relUsername.charAt(0).toUpperCase()}</AvatarFallback>
				</Avatar>
				<div className="flex-1">
					<p className="font-semibold">{relUsername}</p>
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
											'flex items-start gap-2',
											isMine ? 'justify-end ps-[10%]' : 'justify-start pe-[10%]'
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
												<CardPreview
													pid={msg.phrase_id}
													lang={msg.lang}
													isMine={isMine}
												/>
											)}
											{msg.request_id && msg.lang && (
												<RequestPreview
													id={msg.request_id}
													lang={msg.lang}
													isMine={isMine}
												/>
											)}
											<div
												className={cn(
													'relative z-0 max-w-xs rounded-b-2xl p-3 lg:max-w-md',
													isMine ?
														'bg-primary text-primary-foreground ms-6 place-self-end'
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
					<Link
						to="/friends/chats/$friendId/recommend"
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
				from={Route.fullPath}
				params={{ uid: profile.uid }}
			>
				View profile
			</Link>
		</p>
	</div>
)
