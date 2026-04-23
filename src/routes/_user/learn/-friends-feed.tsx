import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
	ChevronsRight,
	ListMusic,
	MessageSquarePlus,
	UserPlus,
	WalletCards,
} from 'lucide-react'

import { useFriendUids, useRecentFriendsActivity } from '@/features/feed/hooks'
import type { FeedActivityType } from '@/features/feed/schemas'
import {
	FeedActivityPayloadPhraseSchema,
	FeedActivityPayloadPlaylistSchema,
	FeedActivityPayloadRequestSchema,
} from '@/features/feed/schemas'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useOnePublicProfile } from '@/features/social/public-profile'
import { avatarUrlify } from '@/lib/hooks'
import { ago } from '@/lib/dayjs'

const MAX_FRIENDS = 5
const MAX_ACTIVITIES_PER_FRIEND = 3

export function FriendsFeedSnippet({ viewAllLang }: { viewAllLang: string }) {
	const { data: friends } = useFriendUids()
	const { data: items, isLoading } = useRecentFriendsActivity()

	const groups = useMemo(() => groupByFriend(items), [items])

	if ((friends?.length ?? 0) === 0) {
		return (
			<div
				className="text-muted-foreground text-sm"
				data-testid="friends-feed-empty"
			>
				<p className="italic">Add friends to see what they're learning.</p>
				<Link
					to="/friends/chats"
					search={{ search: true }}
					className="s-link-muted mt-2 inline-flex items-center gap-1"
				>
					<UserPlus className="size-4" />
					Find friends
					<ChevronsRight className="h-4 w-4" />
				</Link>
			</div>
		)
	}

	if (isLoading && groups.length === 0) {
		return (
			<p className="text-muted-foreground text-sm italic">
				Loading recent activity…
			</p>
		)
	}

	if (groups.length === 0) {
		return (
			<div
				className="text-muted-foreground text-sm"
				data-testid="friends-feed-quiet"
			>
				<p className="italic">Your friends haven't posted anything yet.</p>
				<Link
					to="/learn/$lang/requests/new"
					params={{ lang: viewAllLang }}
					className="s-link-muted mt-2 inline-flex items-center gap-1"
				>
					Be the first with a request
					<ChevronsRight className="h-4 w-4" />
				</Link>
			</div>
		)
	}

	return (
		<div data-testid="friends-feed-snippet">
			<ul className="divide-border divide-y">
				{groups.map((group) => (
					<FriendGroup key={group.uid} group={group} />
				))}
			</ul>
			<Link
				to="/learn/$lang/feed"
				params={{ lang: viewAllLang }}
				search={{ feed: 'friends' }}
				className="s-link-muted mt-3 inline-flex items-center gap-1 text-sm"
				data-testid="view-friends-feed-link"
			>
				See more from friends
				<ChevronsRight className="h-4 w-4" />
			</Link>
		</div>
	)
}

type FriendGroupType = { uid: string; items: Array<FeedActivityType> }

function groupByFriend(
	items: Array<FeedActivityType> | undefined
): Array<FriendGroupType> {
	if (!items) return []
	const byUid = new Map<string, Array<FeedActivityType>>()
	for (const item of items) {
		if (!item.uid) continue
		const list = byUid.get(item.uid)
		if (list) list.push(item)
		else byUid.set(item.uid, [item])
	}
	// Map preserves insertion order and items arrive newest-first, so the
	// first key is the most recently active friend.
	return Array.from(byUid.entries(), ([uid, items]) => ({ uid, items })).slice(
		0,
		MAX_FRIENDS
	)
}

function FriendGroup({ group }: { group: FriendGroupType }) {
	const { data: profile } = useOnePublicProfile(group.uid)
	const username = profile?.username ?? '…'
	const avatarUrl = avatarUrlify(profile?.avatar_path)

	return (
		<li className="py-3" data-name="friend-activity-group" data-key={group.uid}>
			<div className="flex items-start gap-3">
				<Link
					to="/friends/$uid"
					params={{ uid: group.uid }}
					className="shrink-0"
				>
					<Avatar className="bg-foreground text-background mt-0.5 size-8 rounded-lg">
						<AvatarImage src={avatarUrl} alt={`${username}'s avatar`} />
						<AvatarFallback className="text-[10px] font-bold">
							{username.slice(0, 2)}
						</AvatarFallback>
					</Avatar>
				</Link>

				<div className="min-w-0 flex-1 space-y-1">
					<div className="text-muted-foreground flex flex-wrap items-baseline gap-x-1.5 text-sm">
						<Link
							to="/friends/$uid"
							params={{ uid: group.uid }}
							className="text-foreground font-medium hover:underline"
						>
							{username}
						</Link>
						<span aria-hidden>·</span>
						<span>{ago(group.items[0].created_at)}</span>
						<span aria-hidden>·</span>
						<span>{group.items.length} contributions</span>
					</div>
					<ul className="space-y-0">
						{group.items.slice(0, MAX_ACTIVITIES_PER_FRIEND).map((item) => (
							<ActivityLine key={item.id} item={item} />
						))}
					</ul>
				</div>
			</div>
		</li>
	)
}

type ActivityMeta = {
	verb: string
	kind: string
	Icon: typeof ListMusic
	preview: string | null
	to: string
	params: Record<string, string>
}

function activityMeta(item: FeedActivityType): ActivityMeta | null {
	if (item.type === 'request') {
		const payload = FeedActivityPayloadRequestSchema.parse(item.payload)
		return {
			verb: 'posted',
			kind: 'a request',
			Icon: MessageSquarePlus,
			preview: payload.prompt,
			to: '/learn/$lang/requests/$id',
			params: { lang: item.lang, id: item.id },
		}
	}
	if (item.type === 'playlist') {
		const payload = FeedActivityPayloadPlaylistSchema.parse(item.payload)
		const countLabel =
			payload.phrase_count === 1
				? '1 phrase'
				: `${payload.phrase_count} phrases`
		return {
			verb: 'created',
			kind: 'a playlist',
			Icon: ListMusic,
			preview: `${payload.title} · ${countLabel}`,
			to: '/learn/$lang/playlists/$playlistId',
			params: { lang: item.lang, playlistId: item.id },
		}
	}
	if (item.type === 'phrase') {
		const payload = FeedActivityPayloadPhraseSchema.parse(item.payload)
		return {
			verb: 'added',
			kind: 'a phrase',
			Icon: WalletCards,
			preview: payload.text ? `“${payload.text}”` : null,
			to: '/learn/$lang/phrases/$id',
			params: { lang: item.lang, id: item.id },
		}
	}
	return null
}

function ActivityLine({ item }: { item: FeedActivityType }) {
	const meta = activityMeta(item)
	if (!meta) return null
	const { Icon } = meta
	return (
		<li data-name="friend-activity-line" data-key={item.id}>
			<Link
				to={meta.to}
				params={meta.params}
				className="hover:bg-1-mlo-primary/40 -mx-2 flex items-center gap-1.5 truncate rounded-lg px-2 py-0.5 text-sm"
			>
				<Icon className="text-muted-foreground size-3.5 shrink-0" />
				<span className="text-muted-foreground shrink-0">
					{meta.verb} {meta.kind}
				</span>
				{meta.preview ? (
					<>
						<span className="text-muted-foreground shrink-0" aria-hidden>
							·
						</span>
						<span className="text-foreground truncate font-medium">
							{meta.preview}
						</span>
					</>
				) : null}
			</Link>
		</li>
	)
}
