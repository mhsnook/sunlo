import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { MessageCircle, UserPlus, X } from 'lucide-react'
import { and, eq, useLiveQuery } from '@tanstack/react-db'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { LangBadge } from '@/components/ui/badge'
import { avatarUrlify } from '@/lib/hooks'
import { ago } from '@/lib/dayjs'
import { cn } from '@/lib/utils'
import type { uuid, UseLiveQueryResult } from '@/types/main'
import type { LanguageKnownType } from '@/features/profile/schemas'
import {
	useAllChats,
	useFriendRequestAction,
	useIncomingFriendRequests,
	useRelationFriends,
	useUnreadMessages,
} from '@/features/social/hooks'
import { relationsFull, type RelationsFullType } from '@/features/social/live'
import { useProfile } from '@/features/profile/hooks'

const PAGE_SIZE = 10

const hotness = (r: FriendRow) =>
	r.kind === 'incoming-request' || r.kind === 'friend-unread' ? 1 : 0

type FriendRowKind =
	| 'incoming-request'
	| 'outgoing-request'
	| 'friend-unread'
	| 'friend-recent'
	| 'friend-quiet'

type FriendRow = {
	uid: uuid
	profile: RelationsFullType['profile']
	kind: FriendRowKind
	statusText: string
	sortKey: string
	unreadCount: number
}

const useOutgoingFriendRequests = (): UseLiveQueryResult<RelationsFullType[]> =>
	useLiveQuery((q) =>
		q
			.from({ relation: relationsFull })
			.where(({ relation }) =>
				and(
					eq(relation.status, 'pending'),
					eq(relation.most_recent_uid_for, relation.uid)
				)
			)
	)

function chatVerb(messageType: string, isByMe: boolean): string {
	if (messageType === 'request')
		return isByMe ? 'You sent a request' : 'Sent a request'
	if (messageType === 'recommendation')
		return isByMe ? 'You sent a recommendation' : 'Sent a recommendation'
	if (messageType === 'playlist')
		return isByMe ? 'You shared a playlist' : 'Shared a playlist'
	if (messageType === 'accepted')
		return isByMe ? 'You accepted a recommendation' : 'Sent a reply'
	return isByMe ? 'You replied' : 'Sent a reply'
}

function useFriendRows(): { rows: FriendRow[]; isLoading: boolean } {
	const { data: friends, isLoading: l1 } = useRelationFriends()
	const { data: incoming, isLoading: l2 } = useIncomingFriendRequests()
	const { data: outgoing, isLoading: l3 } = useOutgoingFriendRequests()
	const { data: chats } = useAllChats()
	const { data: unread } = useUnreadMessages()

	const isLoading = !!l1 || !!l2 || !!l3

	return useMemo(() => {
		if (!friends && !incoming && !outgoing) return { rows: [], isLoading }

		const unreadByUid = new Map<string, number>()
		unread?.forEach((m) => {
			unreadByUid.set(m.sender_uid, (unreadByUid.get(m.sender_uid) ?? 0) + 1)
		})

		const seen = new Set<string>()
		const rows: FriendRow[] = []

		incoming?.forEach((r) => {
			seen.add(r.uid)
			rows.push({
				uid: r.uid,
				profile: r.profile,
				kind: 'incoming-request',
				statusText: `Friend request · ${ago(r.most_recent_created_at) ?? ''}`,
				sortKey: r.most_recent_created_at,
				unreadCount: unreadByUid.get(r.uid) ?? 0,
			})
		})

		outgoing?.forEach((r) => {
			if (seen.has(r.uid)) return
			seen.add(r.uid)
			rows.push({
				uid: r.uid,
				profile: r.profile,
				kind: 'outgoing-request',
				statusText: `Invitation sent · ${ago(r.most_recent_created_at) ?? ''}`,
				sortKey: r.most_recent_created_at,
				unreadCount: 0,
			})
		})

		friends?.forEach((f) => {
			if (seen.has(f.uid)) return
			seen.add(f.uid)
			const lastMsg = chats?.[f.uid]?.at(-1) ?? null
			const unreadCount = unreadByUid.get(f.uid) ?? 0
			const sortKey = lastMsg?.created_at ?? f.most_recent_created_at

			if (unreadCount > 0 && lastMsg) {
				rows.push({
					uid: f.uid,
					profile: f.profile,
					kind: 'friend-unread',
					statusText: `${chatVerb(lastMsg.message_type, false)} · ${ago(lastMsg.created_at) ?? ''}`,
					sortKey,
					unreadCount,
				})
			} else if (lastMsg) {
				rows.push({
					uid: f.uid,
					profile: f.profile,
					kind: 'friend-recent',
					statusText: `${chatVerb(lastMsg.message_type, lastMsg.sender_uid !== f.uid)} · ${ago(lastMsg.created_at) ?? ''}`,
					sortKey,
					unreadCount: 0,
				})
			} else {
				rows.push({
					uid: f.uid,
					profile: f.profile,
					kind: 'friend-quiet',
					statusText: `Connected · ${ago(f.most_recent_created_at) ?? ''}`,
					sortKey,
					unreadCount: 0,
				})
			}
		})

		rows.sort((a, b) => {
			// Pending requests and unread messages float to the top
			const dh = hotness(b) - hotness(a)
			if (dh !== 0) return dh
			return a.sortKey < b.sortKey ? 1 : -1
		})

		return { rows, isLoading }
	}, [friends, incoming, outgoing, chats, unread, isLoading])
}

export function FriendsList() {
	const { rows, isLoading } = useFriendRows()
	const [visible, setVisible] = useState(PAGE_SIZE)

	const { data: myProfile } = useProfile()
	const myLangs = useMemo(
		() => new Set(myProfile?.languages_known?.map((l) => l.lang) ?? []),
		[myProfile]
	)

	if (isLoading && rows.length === 0) {
		return (
			<div className="space-y-2" data-testid="friends-list-loading">
				<FriendRowSkeleton />
				<FriendRowSkeleton />
				<FriendRowSkeleton />
			</div>
		)
	}

	if (rows.length === 0) {
		return (
			<p
				className="text-muted-foreground text-sm italic"
				data-testid="friends-list-empty"
			>
				You haven't connected with anyone yet.
			</p>
		)
	}

	const shown = rows.slice(0, visible)
	const hasMore = rows.length > visible

	return (
		<div data-testid="friends-list" className="space-y-2">
			{shown.map((row) => (
				<FriendRowItem key={row.uid} row={row} myLangs={myLangs} />
			))}
			{hasMore ? (
				<div className="pt-1">
					<Button
						variant="soft"
						size="sm"
						onClick={() => setVisible((v) => v + PAGE_SIZE)}
						data-testid="friends-list-show-more"
					>
						Show more ({rows.length - visible})
					</Button>
				</div>
			) : null}
		</div>
	)
}

function FriendRowItem({
	row,
	myLangs,
}: {
	row: FriendRow
	myLangs: Set<string>
}) {
	const { uid, profile, kind, statusText, unreadCount } = row
	const username = profile?.username ?? '…'
	const languages = profile?.languages_known ?? []

	return (
		<div
			data-name="friend-row"
			data-key={uid}
			className="bg-card flex items-center gap-3 rounded p-3"
		>
			<Link
				to="/friends/$uid"
				params={{ uid }}
				className="shrink-0"
				data-testid="friend-row-avatar-link"
			>
				<Avatar className="size-10">
					<AvatarImage
						src={avatarUrlify(profile?.avatar_path)}
						alt={username}
					/>
					<AvatarFallback className="text-xs font-bold">
						{username.charAt(0).toUpperCase()}
					</AvatarFallback>
				</Avatar>
			</Link>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
					<Link
						to="/friends/$uid"
						params={{ uid }}
						className="text-foreground font-semibold hover:underline"
					>
						{username}
					</Link>
					{languages.map((l: LanguageKnownType) => (
						<LangBadge
							key={l.lang}
							lang={l.lang}
							className={cn(
								'text-[0.6rem]',
								myLangs.has(l.lang) && 'ring-1 ring-primary'
							)}
						/>
					))}
				</div>
				<p
					className={cn(
						'mt-1 line-clamp-1 text-xs',
						kind === 'friend-unread'
							? 'text-foreground font-medium'
							: 'text-muted-foreground'
					)}
				>
					{statusText}
					{unreadCount > 0 ? (
						<span className="text-primary ms-1 font-semibold">
							· {unreadCount} new
						</span>
					) : null}
				</p>
			</div>

			<FriendRowActions uid={uid} kind={kind} />
		</div>
	)
}

function FriendRowActions({ uid, kind }: { uid: uuid; kind: FriendRowKind }) {
	const action = useFriendRequestAction(uid)

	if (kind === 'incoming-request') {
		return (
			<div className="flex shrink-0 items-center gap-1">
				<Button
					variant="default"
					size="sm"
					onClick={() => action.mutate('accept')}
					disabled={action.isPending}
					data-testid="friend-row-accept"
				>
					<UserPlus />
					Accept
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => action.mutate('decline')}
					disabled={action.isPending}
					aria-label="Decline friend request"
					data-testid="friend-row-decline"
				>
					<X />
				</Button>
			</div>
		)
	}

	if (kind === 'outgoing-request') {
		return (
			<span
				className="text-muted-foreground shrink-0 text-xs italic"
				data-testid="friend-row-pending"
			>
				Pending
			</span>
		)
	}

	return (
		<Link
			to="/friends/chats/$friendUid"
			params={{ friendUid: uid }}
			className={cn(
				buttonVariants({ variant: 'soft', size: 'sm' }),
				'shrink-0'
			)}
			data-testid="friend-row-message"
		>
			<MessageCircle />
			Message
		</Link>
	)
}

const FriendRowSkeleton = () => (
	<div className="bg-card flex animate-pulse items-center gap-3 rounded p-3">
		<div className="bg-1-lo-neutral size-10 shrink-0 rounded-lg" />
		<div className="flex-1 space-y-2">
			<div className="bg-1-lo-neutral h-4 w-1/3 rounded" />
			<div className="bg-1-lo-neutral h-3 w-1/2 rounded" />
		</div>
		<div className="bg-1-lo-neutral h-8 w-24 rounded-xl" />
	</div>
)
