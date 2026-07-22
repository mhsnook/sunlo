import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import type {
	NotificationType,
	NotificationTypeEnum,
} from '@/features/notifications/schemas'
import { useMarkAsRead } from '@/features/notifications/hooks'
import { useRequest } from '@/features/requests/hooks'
import { useOnePhrase } from '@/features/phrases/hooks'
import { useOneComment } from '@/features/requests/hooks'
import { Button } from '@/components/ui/button'

const notificationConfig: Record<
	NotificationTypeEnum,
	{ Icon: LucideIcon; action: string; iconClass: string }
> = {
	request_commented: {
		Icon: MessageSquareQuote,
		action: 'commented on your request',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-primary bg-lc-1 bg-chroma-lo bg-hue-primary',
	},
	comment_replied: {
		Icon: MessagesSquare,
		action: 'replied to your comment',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-info bg-lc-1 bg-chroma-lo bg-hue-info',
	},
	phrase_translated: {
		Icon: Languages,
		action: 'added a translation to your phrase',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-success bg-lc-1 bg-chroma-lo bg-hue-success',
	},
	phrase_referenced: {
		Icon: Link2,
		action: 'referenced your phrase as an answer',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-accent bg-lc-1 bg-chroma-lo bg-hue-accent',
	},
	request_upvoted: {
		Icon: ThumbsUp,
		action: 'upvoted your request',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-warning bg-lc-1 bg-chroma-lo bg-hue-warning',
	},
	change_suggested: {
		Icon: MessageSquareQuote,
		action: 'suggested a change to your content',
		iconClass:
			'text-lc-7 text-chroma-mid text-hue-neutral bg-lc-1 bg-chroma-lo bg-hue-neutral',
	},
}

function useNotificationLink(notification: NotificationType): {
	to: string
	params: Record<string, string>
	search?: Record<string, string>
} | null {
	const { request_id, comment_id, phrase_id } = notification

	const { data: request } = useRequest(request_id)
	const { data: comment } = useOneComment(comment_id ?? undefined)
	// Only resolve the phrase when there's no request_id (phrase-only notifications)
	const { data: phrase } = useOnePhrase(request_id ? undefined : phrase_id)

	// Request-related notifications
	if (notification.request_id && request) {
		const search: Record<string, string> = {}

		if (notification.comment_id && comment) {
			search.focus = comment.id
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
	const navigate = useNavigate()

	const handleClick = (
		e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>
	) => {
		const target = e.target as HTMLElement
		if (!e.currentTarget?.contains(target)) return
		if (target.closest('button, a, input')) return

		if (isUnread) markAsRead.mutate(notification.id)
		if (link)
			void navigate({ to: link.to, params: link.params, search: link.search })
	}

	const style = {
		viewTransitionName: `notification-${notification.id}`,
	} as CSSProperties

	return (
		// oxlint-disable-next-line jsx-a11y/control-has-associated-label -- accessible name comes from rich nested content (actor name, body, time)
		<div
			// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- intentional div-as-link; avoiding nested-anchor invariant inside a list item
			role="link"
			tabIndex={0}
			className={cn(
				'group flex cursor-pointer items-start gap-3 rounded p-3 transition-all duration-300',
				isUnread
					? 'border-s-primary bg-card/80 border-s-2'
					: 'animate-card-pop-in bg-transparent opacity-70 hover:opacity-100'
			)}
			style={style}
			data-testid="notification-item"
			onClick={handleClick}
			onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
				if (e.key === 'Enter') handleClick(e)
			}}
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
						<UidPermalinkInline uid={notification.actor_uid} />
						<p className="text-muted-foreground mt-0.5 text-sm">
							{config.action}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<span className="text-muted-foreground text-xs whitespace-nowrap">
							{ago(notification.created_at)}
						</span>
						{isUnread && (
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6"
								aria-label="Mark as read"
								onClick={() => markAsRead.mutate(notification.id)}
							>
								<div className="bg-primary h-2.5 w-2.5 rounded-full" />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
