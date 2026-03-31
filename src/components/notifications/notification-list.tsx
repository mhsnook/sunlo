import type { ReactNode } from 'react'
import { BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	useNotifications,
	useMarkAllAsRead,
	useUnreadCount,
} from '@/features/notifications/hooks'
import { NotificationItem } from './notification-item'
import type { NotificationType } from '@/features/notifications/schemas'

export function NotificationList() {
	const { data: notifications } = useNotifications()
	const markAllAsRead = useMarkAllAsRead()
	const unreadCount = useUnreadCount()

	if (!notifications || notifications.length === 0) {
		return <EmptyState />
	}

	const unread = notifications.filter((n) => n.read_at === null)
	const read = notifications
		.filter((n) => n.read_at !== null)
		.toSorted(
			(a, b) => new Date(b.read_at!).getTime() - new Date(a.read_at!).getTime()
		)

	return (
		<div className="flex flex-col gap-4">
			{unread.length > 0 && (
				<NotificationGroup
					title={`${unread.length} new`}
					notifications={unread}
					action={
						!!unreadCount && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => markAllAsRead.mutate()}
								disabled={markAllAsRead.isPending}
							>
								Mark all as read
							</Button>
						)
					}
				/>
			)}
			{read.length > 0 && (
				<NotificationGroup title="Earlier" notifications={read} />
			)}
		</div>
	)
}

function NotificationGroup({
	title,
	notifications,
	action,
}: {
	title: string
	notifications: Array<NotificationType>
	action?: ReactNode
}) {
	return (
		<Card>
			<CardHeader className="flex-row items-center justify-between pb-2">
				<CardTitle className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
					{title}
				</CardTitle>
				{action}
			</CardHeader>
			<CardContent className="flex flex-col gap-1 px-3 pb-3">
				{notifications.map((notification) => (
					<NotificationItem key={notification.id} notification={notification} />
				))}
			</CardContent>
		</Card>
	)
}

function EmptyState() {
	return (
		<Card className="mx-auto mt-[10cqh] max-w-md">
			<CardContent className="flex flex-col items-center gap-3 py-12 text-center">
				<div className="bg-1-lo-neutral flex h-16 w-16 items-center justify-center rounded-full">
					<BellOff className="text-muted-foreground h-8 w-8" />
				</div>
				<h3 className="text-lg font-semibold">No notifications yet</h3>
				<p className="text-muted-foreground max-w-xs text-sm">
					When people comment on your requests, translate your phrases, or
					upvote your content, you'll see it here.
				</p>
			</CardContent>
		</Card>
	)
}
