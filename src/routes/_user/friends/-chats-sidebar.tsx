import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
	useAllChats,
	useRelationFriends,
	useUnreadCounts,
} from '@/hooks/use-friends'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { ago } from '@/lib/dayjs'

const linkActiveProps = {
	className: 'bg-accent/20 text-accent-foreground',
}

export function ChatsSidebar() {
	const { data: friends, isLoading: isLoadingFriends } = useRelationFriends()
	const { data: chats, isLoading: isLoadingChats } = useAllChats()
	const { data: unreadCounts } = useUnreadCounts()

	// Sort by recent activity
	const sortedFriends = friends?.toSorted((a, b) =>
		a.most_recent_created_at === b.most_recent_created_at ? 0
		: a.most_recent_created_at < b.most_recent_created_at ? 1
		: -1
	)

	return (
		<Card className="flex h-[calc(100vh-5rem-4px)] w-full flex-col">
			<CardHeader className="sr-only">
				<CardTitle>Chats</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
				{isLoadingFriends || isLoadingChats ?
					<>
						<ChatSkeleton />
						<ChatSkeleton />
						<ChatSkeleton />
					</>
				: !sortedFriends || !sortedFriends.length ?
					<p className="text-muted-foreground p-4 text-sm">
						You have no friends to chat with yet.
					</p>
				:	sortedFriends.map((friend) => {
						const thisChatMessage =
							!chats || !chats[friend.uid] ? null : chats[friend.uid].at(-1)
						const unreadCount = unreadCounts?.[friend.uid] ?? 0
						return (
							<Link
								key={friend.uid}
								to="/friends/chats/$friendUid"
								params={{ friendUid: friend.uid }}
								className={cn(
									'hover:bg-accent/30 hover:text-accent-foreground flex items-center gap-3 rounded-2xl px-3 py-2 transition-all'
								)}
								activeProps={linkActiveProps}
							>
								<Avatar className="h-8 w-8">
									<AvatarImage
										src={avatarUrlify(friend.profile?.avatar_path)}
										alt={friend.profile?.username}
									/>
									<AvatarFallback>
										{friend.profile?.username?.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 overflow-hidden">
									<div className="flex items-center gap-2">
										<span
											className={cn(
												'font-semibold',
												unreadCount > 0 && 'text-foreground'
											)}
										>
											{friend.profile?.username}
										</span>
										{unreadCount > 0 && (
											<Badge
												variant="default"
												className="h-5 min-w-5 justify-center px-1.5 text-xs"
											>
												{unreadCount}
											</Badge>
										)}
									</div>
									<p
										className={cn(
											'line-clamp-2 text-xs',
											unreadCount > 0 ?
												'text-foreground font-medium'
											:	'text-muted-foreground'
										)}
									>
										{thisChatMessage ?
											<>
												{ago(thisChatMessage.created_at)} •{' '}
												{thisChatMessage.isByMe ? 'you ' : 'they '}
												{thisChatMessage.message_type === 'recommendation' ?
													'sent a recommendation'
												: thisChatMessage.message_type === 'request' ?
													'requested a card'
												: thisChatMessage.message_type === 'playlist' ?
													'shared a playlist'
												:	'accepted your recommendation'}
											</>
										:	'No messages yet'}
									</p>
								</div>
							</Link>
						)
					})
				}
			</CardContent>
		</Card>
	)
}

const ChatSkeleton = () => (
	<div className="flex h-20 animate-pulse flex-row items-center gap-3 rounded-2xl px-3 py-2">
		<div className="h-8 w-8 rounded-full bg-gray-800/50"></div>
		<div className="h-16 w-full flex-1 space-y-2 rounded">
			<div className="flex flex-row gap-2">
				<div className="h-4 w-[50%] rounded bg-gray-800/50"></div>
				<div className="h-4 w-[10%] rounded bg-gray-800/50"></div>
			</div>
			<div className="h-8 w-[100%] rounded bg-gray-800/50"></div>
		</div>
	</div>
)
