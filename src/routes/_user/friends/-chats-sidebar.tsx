import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
	useAllChats,
	useRelationFriends,
	useUnreadMessages,
} from '@/hooks/use-friends'
import { ChatMessageType } from '@/lib/schemas'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { ago } from '@/lib/dayjs'

const linkActiveProps = {
	className: 'bg-accent/20 text-accent-foreground',
}

export function ChatsSidebar() {
	const { data: friends, isLoading: isLoadingFriends } = useRelationFriends()
	const { data: chats, isLoading: isLoadingChats } = useAllChats()
	const { data: unreadMessages } = useUnreadMessages()

	// Count unread messages per friend and track the oldest unread message
	const unreadCountByFriend = new Map<string, number>()
	const oldestUnreadByFriend = new Map<string, ChatMessageType>()
	unreadMessages?.forEach((msg) => {
		const count = unreadCountByFriend.get(msg.sender_uid) ?? 0
		unreadCountByFriend.set(msg.sender_uid, count + 1)
		// Keep the oldest unread message (first one we see, or replace if older)
		const existing = oldestUnreadByFriend.get(msg.sender_uid)
		if (!existing || msg.created_at < existing.created_at) {
			oldestUnreadByFriend.set(msg.sender_uid, msg)
		}
	})

	// Sort by recent activity (prioritize friends with unread messages)
	const sortedFriends = friends?.toSorted((a, b) => {
		const aUnread = unreadCountByFriend.get(a.uid) ?? 0
		const bUnread = unreadCountByFriend.get(b.uid) ?? 0
		// Friends with unread messages come first
		if (aUnread > 0 && bUnread === 0) return -1
		if (bUnread > 0 && aUnread === 0) return 1
		// Then sort by most recent activity
		return (
			a.most_recent_created_at === b.most_recent_created_at ? 0
			: a.most_recent_created_at < b.most_recent_created_at ? 1
			: -1
		)
	})

	return (
		<Card className="flex h-full w-full flex-col">
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
						// Prefer showing the oldest unread message, otherwise show most recent
						const oldestUnread = oldestUnreadByFriend.get(friend.uid)
						const mostRecentMessage =
							!chats || !chats[friend.uid] ? null : chats[friend.uid].at(-1)
						const thisChatMessage = oldestUnread ?? mostRecentMessage
						const isUnreadPreview = !!oldestUnread
						const unreadCount = unreadCountByFriend.get(friend.uid)
						return (
							<Link
								data-testid="friend-chat-link"
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
									<div className="flex items-center gap-2 font-semibold">
										<span>{friend.profile?.username}</span>
										{unreadCount ?
											<Badge data-testid="unread-badge" size="sm">
												{unreadCount}
											</Badge>
										:	null}
									</div>
									<p
										className={cn(
											'line-clamp-2 text-xs',
											isUnreadPreview ?
												'text-foreground font-medium'
											:	'text-muted-foreground'
										)}
									>
										{thisChatMessage ?
											<>
												{ago(thisChatMessage.created_at)} •{' '}
												{/* Unread messages are always from the friend */}
												{'isByMe' in thisChatMessage && thisChatMessage.isByMe ?
													'you '
												:	'they '}
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
			<div className="h-8 w-full rounded bg-gray-800/50"></div>
		</div>
	</div>
)
