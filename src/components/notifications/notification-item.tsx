import type { CSSProperties } from 'react'
import { Link } from '@tanstack/react-router'
import {
	MessageSquareQuote,
	MessagesSquare,
	Languages,
	Link2,
	ThumbsUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ago } from '@/lib/dayjs'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import type {
	NotificationType,
	NotificationTypeEnum,
} from '@/features/notifications/schemas'
import { useMarkAsRead } from '@/features/notifications/hooks'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { phrasesCollection } from '@/features/phrases/collections'
import { commentsCollection } from '@/features/comments/collections'

const notificationConfig: Record<
	NotificationTypeEnum,
	{ Icon: LucideIcon; action: string; iconClass: string }
> = {
	request_commented: {
		Icon: MessageSquareQuote,
		action: 'commented on your request',
		iconClass: 'text-7-mid-primary bg-1-lo-primary',
	},
	comment_replied: {
		Icon: MessagesSquare,
		action: 'replied to your comment',
		iconClass: 'text-7-mid-info bg-1-lo-info',
	},
	phrase_translated: {
		Icon: Languages,
		action: 'added a translation to your phrase',
		iconClass: 'text-7-mid-success bg-1-lo-success',
	},
	phrase_referenced: {
		Icon: Link2,
		action: 'referenced your phrase as an answer',
		iconClass: 'text-7-mid-accent bg-1-lo-accent',
	},
	request_upvoted: {
		Icon: ThumbsUp,
		action: 'upvoted your request',
		iconClass: 'text-7-mid-warning bg-1-lo-warning',
	},
	change_suggested: {
		Icon: MessageSquareQuote,
		action: 'suggested a change to your content',
		iconClass: 'text-7-mid-neutral bg-1-lo-neutral',
	},
}

function useNotificationLink(notification: NotificationType): {
	to: string
	params: Record<string, string>
	search?: Record<string, string>
} | null {
	const { request_id, comment_id, phrase_id } = notification

	// Look up the request for lang + comment search params
	const { data: request } = useLiveQuery(
		(q) =>
			!request_id ? undefined : (
				q
					.from({ r: phraseRequestsCollection })
					.where(({ r }) => eq(r.id, request_id))
					.findOne()
			),
		[request_id]
	)

	// Look up the comment to determine if it's a reply (has parent_comment_id)
	const { data: comment } = useLiveQuery(
		(q) =>
			!comment_id ? undefined : (
				q
					.from({ c: commentsCollection })
					.where(({ c }) => eq(c.id, comment_id))
					.findOne()
			),
		[comment_id]
	)

	// Look up the phrase for lang (phrase_translated, phrase_referenced)
	const { data: phrase } = useLiveQuery(
		(q) =>
			request_id || !phrase_id ? undefined : (
				q
					.from({ p: phrasesCollection })
					.where(({ p }) => eq(p.id, phrase_id))
					.findOne()
			),
		[phrase_id, request_id]
	)

	// Request-related notifications
	if (notification.request_id && request) {
		const search: Record<string, string> = {}

		if (notification.comment_id && comment) {
			if (comment.parent_comment_id) {
				// It's a reply — open the parent thread and highlight the reply
				search.showSubthread = comment.parent_comment_id
				search.highlightComment = comment.id
			} else {
				// It's a top-level comment — open its thread
				search.showSubthread = comment.id
			}
		}

		return {
			to: '/learn/$lang/requests/$id',
			params: { lang: request.lang, id: request.id },
			...(Object.keys(search).length > 0 && { search }),
		}
	}

	// Phrase-only notifications (no request_id)
	if (notification.phrase_id && phrase) {
		return {
			to: '/learn/$lang/phrases/$id',
			params: { lang: phrase.lang, id: phrase.id },
		}
	}

	return null
}

export function NotificationItem({
	notification,
}: {
	notification: NotificationType
}) {
	const config = notificationConfig[notification.type]
	const markAsRead = useMarkAsRead()
	const isUnread = notification.read_at === null
	const link = useNotificationLink(notification)

	const handleClick = () => {
		if (isUnread) markAsRead.mutate(notification.id)
	}

	const style = {
		viewTransitionName: `notification-${notification.id}`,
	} as CSSProperties

	const content = (
		<div
			className={cn(
				'group flex items-start gap-3 rounded p-3 transition-all duration-300',
				isUnread ?
					'border-s-primary bg-card/80 border-s-2'
				:	'animate-card-pop-in bg-transparent opacity-70 hover:opacity-100'
			)}
			style={style}
			data-testid="notification-item"
		>
			<div
				className={cn(
					'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
					config.iconClass
				)}
			>
				<config.Icon className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<div>
						<UidPermalinkInline uid={notification.actor_uid} nonInteractive />
						<p className="text-muted-foreground mt-0.5 text-sm">
							{config.action}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{ago(notification.created_at)}
						</span>
						{isUnread && (
							<div className="bg-primary h-2 w-2 shrink-0 rounded-full" />
						)}
					</div>
				</div>
			</div>
		</div>
	)

	if (link) {
		return (
			<Link
				to={link.to}
				params={link.params}
				search={link.search}
				onClick={handleClick}
				className="block"
			>
				{content}
			</Link>
		)
	}

	return (
		<button type="button" onClick={handleClick} className="w-full text-start">
			{content}
		</button>
	)
}
