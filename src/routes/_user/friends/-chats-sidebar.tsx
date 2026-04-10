import { Link } from '@tanstack/react-router'
import { UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { type ChatEntry, useChatEntries } from '@/features/social/hooks'
import { cn } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { ago } from '@/lib/dayjs'

const linkActiveProps = {
	className: 'bg-1-mlo-accent text-accent-foreground',
}

export function ChatsSidebar() {
	const { data: entries, isLoading } = useChatEntries()

	return (
		<Card className="flex h-full w-full flex-col">
			<CardHeader className="sr-only">
				<CardTitle>Chats</CardTitle>
			</CardHeader>
			<CardContent
				data-testid="friend-chat-list"
				className="flex flex-1 flex-col gap-2 overflow-y-auto p-2"
			>
				{isLoading ?
					<>
						<ChatSkeleton />
						<ChatSkeleton />
						<ChatSkeleton />
					</>
				: !entries?.length ?
					<p className="text-muted-foreground p-4 text-sm">
						You have no friends to chat with yet.
					</p>
				:	entries.map((entry) => <ChatEntryItem key={entry.uid} entry={entry} />)
				}
			</CardContent>
		</Card>
	)
}

function ChatEntryItem({ entry }: { entry: ChatEntry }) {
	const {
		uid,
		profile,
		hasPendingRequest,
		unreadCount,
		oldestUnread,
		mostRecentMessage,
		mostRecentActivity,
	} = entry

	// Prefer oldest unread message as preview, fall back to most recent
	const previewMessage = oldestUnread ?? mostRecentMessage
	const isUnreadPreview = !!oldestUnread

	return (
		<Link
			data-name="friend-chat-link"
			data-key={uid}
			to="/friends/chats/$friendUid"
			params={{ friendUid: uid }}
			className="hover:bg-1-mlo-accent hover:text-accent-foreground flex items-center gap-3 rounded-2xl px-3 py-2 transition-all"
			activeProps={linkActiveProps}
		>
			<Avatar className="h-8 w-8">
				<AvatarImage
					src={avatarUrlify(profile?.avatar_path)}
					alt={profile?.username}
				/>
				<AvatarFallback>
					{profile?.username?.charAt(0).toUpperCase()}
				</AvatarFallback>
			</Avatar>
			<div className="flex-1 overflow-hidden">
				<div className="flex items-center gap-2 font-semibold">
					<span>{profile?.username}</span>
					{unreadCount ?
						<Badge data-testid="unread-badge" size="sm">
							{unreadCount}
						</Badge>
					: hasPendingRequest ?
						<div className="bg-primary h-2.5 w-2.5 rounded-full" />
					:	null}
				</div>
				{hasPendingRequest && !previewMessage ?
					<p className="text-muted-foreground line-clamp-1 text-xs">
						<UserPlus className="me-1 inline size-3" />
						Wants to connect • {ago(mostRecentActivity)}
					</p>
				:	<p
						className={cn(
							'line-clamp-2 text-xs',
							isUnreadPreview ?
								'text-foreground font-medium'
							:	'text-muted-foreground'
						)}
					>
						{previewMessage ?
							<>
								{ago(previewMessage.created_at)} •{' '}
								{'isByMe' in previewMessage && previewMessage.isByMe ?
									'you '
								:	'they '}
								{previewMessage.message_type === 'recommendation' ?
									'sent a recommendation'
								: previewMessage.message_type === 'request' ?
									'requested a card'
								: previewMessage.message_type === 'playlist' ?
									'shared a playlist'
								:	'accepted your recommendation'}
							</>
						:	'No messages yet'}
					</p>
				}
			</div>
		</Link>
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
