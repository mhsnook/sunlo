import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { Plus, UserPlus } from 'lucide-react'

import type { PublicProfileType } from '@/features/profile/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Bubble } from '@/components/ui/bubble'
import { ComposeBar } from '@/components/ui/compose-bar'
import { MessageScroller } from '@/components/ui/message-scroller'
import {
	Message,
	MessageAvatar,
	MessageContent,
	MessageHeader,
	MessageMarker,
} from '@/components/ui/message'
import {
	markChatRead,
	useOneFriendChat,
	useOneRelation,
} from '@/features/social/hooks'
import { RelationshipActions } from '@/routes/_user/friends/-relationship-actions'
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
	staticData: {
		appnav: [],
		titleBar: { title: 'Chat' },
	},
})

/**
 * A text message the user typed here. `chat_message` has no body column and
 * `MessageTypeEnumSchema` has no text variant, so these live in component
 * state and disappear on navigation. They exist to exercise the compose bar
 * and the text bubble until the schema catches up.
 */
type LocalDraftType = {
	id: string
	body: string
	created_at: string
}

function ChatPage() {
	const { friendUid } = Route.useParams()
	const { data: relation } = useOneRelation(friendUid)
	const userId = useUserId()
	// Track which messages we've already sent mark-as-read for
	const markedAsReadRef = useRef<Set<string>>(new Set())
	const [draft, setDraft] = useState('')
	const [localDrafts, setLocalDrafts] = useState<Array<LocalDraftType>>([])

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
			markChatRead({ friendUid, recipientUid: userId, read_at })
		}
	}, [messagesQuery.data, friendUid, userId])

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
						<AvatarFallback seed={friendUid}>
							{relUsername.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				</Link>
				<div className="flex-1">
					<p className="font-semibold">{relUsername}</p>
					<p className="text-muted-foreground text-xs">
						{relation.status === 'friends' ? (
							'Friends'
						) : relation.status === 'pending' && !relation.isMostRecentByMe ? (
							<span className="text-primary inline-flex items-center gap-1">
								<UserPlus className="size-3" /> Wants to connect
							</span>
						) : relation.status === 'pending' ? (
							'Request sent'
						) : (
							'Not connected'
						)}
					</p>
				</div>
			</CardHeader>
			<CardContent className="min-h-0 flex-1 p-0">
				<MessageScroller
					dependency={[messagesQuery.data, localDrafts]}
					className="px-4"
				>
					<div
						className="flex flex-col gap-4 pt-4 pb-2"
						data-testid="chat-messages-container"
					>
						{!messagesQuery.data?.length && !localDrafts.length ? (
							<EmptyChat profile={relation.profile} />
						) : (
							messagesQuery.data?.map((msg) => {
								if (typeof msg === 'undefined') return null
								const isMine = msg.sender_uid === userId
								const messageLabel =
									msg.message_type === 'recommendation'
										? 'Sent a phrase recommendation'
										: msg.message_type === 'request'
											? 'Requested a phrase'
											: msg.message_type === 'playlist'
												? 'Shared a playlist'
												: `${isMine ? 'You' : relUsername} added this to ${
														isMine ? 'your' : 'their'
													} deck`
								return (
									<Message
										key={msg.id}
										align={isMine ? 'end' : 'start'}
										data-testid="chat-message-bubble"
									>
										{!isMine && (
											<MessageAvatar>
												<Avatar className="size-8">
													<AvatarImage src={relAvatarUrl} alt={relUsername} />
													<AvatarFallback seed={friendUid}>
														{relUsername.charAt(0).toUpperCase()}
													</AvatarFallback>
												</Avatar>
											</MessageAvatar>
										)}
										<MessageContent className="max-w-[85%]">
											<MessageHeader>
												<span>{messageLabel}</span>
												<span>&middot;</span>
												<span>{ago(msg.created_at)}</span>
											</MessageHeader>
											{/* Every payload here brings its own card, so the
											    bubble stays unframed rather than boxing a box. */}
											<Bubble variant="ghost">
												{msg.phrase_id && msg.lang && (
													<CardPreview pid={msg.phrase_id} isMine={isMine} />
												)}
												{msg.request_id && msg.lang && (
													<RequestPreview id={msg.request_id} />
												)}
												{msg.playlist_id && msg.lang && (
													<PlaylistPreview id={msg.playlist_id} />
												)}
											</Bubble>
										</MessageContent>
									</Message>
								)
							})
						)}
						{localDrafts.length > 0 && (
							<MessageMarker>Only on this device</MessageMarker>
						)}
						{localDrafts.map((local) => (
							<Message
								key={local.id}
								align="end"
								data-testid="chat-message-bubble"
							>
								<MessageContent className="max-w-[85%]">
									<Bubble variant="primary" align="end">
										{local.body}
									</Bubble>
								</MessageContent>
							</Message>
						))}
					</div>
				</MessageScroller>
			</CardContent>
			<div className="border-t p-4">
				{relation.status === 'friends' ? (
					<ComposeBar
						value={draft}
						onValueChange={setDraft}
						onSend={(body) => {
							setLocalDrafts((current) => [
								...current,
								{
									id: crypto.randomUUID(),
									body,
									created_at: new Date().toISOString(),
								},
							])
							setDraft('')
						}}
						placeholder={`Message ${relUsername}…`}
						startSlot={
							<Link
								to="/friends/chats/$friendUid/recommend"
								from={Route.fullPath}
								aria-label="Send a phrase, playlist, or request"
								data-testid="chat-share-trigger"
								className={cn(
									buttonVariants({ variant: 'soft', size: 'icon' }),
									'mb-1'
								)}
							>
								<Plus />
							</Link>
						}
					/>
				) : relation.status === 'pending' && !relation.isMostRecentByMe ? (
					<div className="flex flex-col items-center gap-2 py-2">
						<p className="text-muted-foreground text-sm">
							{relUsername} wants to connect
						</p>
						<RelationshipActions uid_for={friendUid} />
					</div>
				) : (
					<p className="text-muted-foreground p-2 text-center text-sm italic">
						{relation.status === 'pending'
							? 'Waiting for them to accept your request.'
							: 'You must be friends to chat.'}
					</p>
				)}
			</div>
			<Outlet />
		</Card>
	)
}

const EmptyChat = ({ profile }: { profile: PublicProfileType }) => (
	<div className="flex flex-col items-center justify-center gap-6 py-10">
		<p className="text-xl font-bold">{profile.username}</p>
		<div className="bg-muted-foreground/40 relative mx-auto flex size-32 items-center justify-center rounded-full text-4xl">
			{profile.avatar_path ? (
				<img
					src={avatarUrlify(profile.avatar_path, 128)}
					alt={`${profile.username ? `${profile.username}'s` : 'Your'} avatar`}
					className="size-32 rounded-full object-cover"
				/>
			) : (
				<span className="absolute top-0 right-0 bottom-0 left-0 flex size-32 items-center justify-center font-bold capitalize">
					{(profile.username ?? '').slice(0, 2)}
				</span>
			)}
		</div>
		<p>
			<Link
				className={buttonVariants({ variant: 'neutral' })}
				to="/friends/$uid"
				from={Route.fullPath}
				params={{ uid: profile.uid }}
			>
				View profile
			</Link>
		</p>
	</div>
)
