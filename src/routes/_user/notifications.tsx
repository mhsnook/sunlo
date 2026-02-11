import { createFileRoute, Link } from '@tanstack/react-router'
import { RequireAuth } from '@/components/require-auth'
import { notificationsCollection } from '@/lib/collections'
import {
	useNotifications,
	useMarkAllNotificationsRead,
	useMarkNotificationRead,
	useRespondToSuggestion,
} from '@/hooks/use-notifications'
import type { NotificationType } from '@/lib/schemas'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { UidPermalinkInline } from '@/components/card-pieces/user-permalink'
import { ago } from '@/lib/dayjs'
import { Check, CheckCheck, Eye, MessageSquareWarning } from 'lucide-react'
import { eq, useLiveQuery } from '@tanstack/react-db'
import {
	translationSuggestionsCollection,
	phrasesCollection,
} from '@/lib/collections'
import { toastSuccess } from '@/components/ui/sonner'

export const Route = createFileRoute('/_user/notifications')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Notifications',
		},
	}),
	loader: async ({ context }) => {
		if (!context.auth.isAuth) return
		await notificationsCollection.preload()
	},
	component: NotificationsPage,
})

function NotificationsPage() {
	return (
		<RequireAuth message="Log in to see your notifications.">
			<NotificationsContent />
		</RequireAuth>
	)
}

function NotificationsContent() {
	const { data: notifications } = useNotifications()
	const markAllRead = useMarkAllNotificationsRead()
	const hasUnread = notifications?.some((n) => !n.is_read)

	return (
		<main data-testid="notifications-page" className="space-y-4 px-px">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Notifications</h2>
				{hasUnread && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => markAllRead.mutate()}
						disabled={markAllRead.isPending}
					>
						<CheckCheck className="mr-1 h-4 w-4" />
						Mark all read
					</Button>
				)}
			</div>

			{!notifications?.length ?
				<Card>
					<CardContent className="py-8 text-center">
						<MessageSquareWarning className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
						<p className="text-muted-foreground">No notifications yet</p>
						<p className="text-muted-foreground mt-1 text-sm">
							When someone suggests a correction to one of your translations,
							you&rsquo;ll see it here.
						</p>
					</CardContent>
				</Card>
			:	<div className="space-y-3">
					{notifications.map((notification) => (
						<NotificationItem
							key={notification.id}
							notification={notification}
						/>
					))}
				</div>
			}
		</main>
	)
}

function NotificationItem({
	notification,
}: {
	notification: NotificationType
}) {
	const markRead = useMarkNotificationRead()

	if (notification.type === 'translation_suggestion') {
		return (
			<TranslationSuggestionNotification
				notification={notification}
				onRead={() => {
					if (!notification.is_read) markRead.mutate(notification.id)
				}}
			/>
		)
	}

	return null
}

function TranslationSuggestionNotification({
	notification,
	onRead,
}: {
	notification: NotificationType
	onRead: () => void
}) {
	const { data: suggestion } = useLiveQuery(
		(q) =>
			q
				.from({ suggestion: translationSuggestionsCollection })
				.where(({ suggestion }) => eq(suggestion.id, notification.reference_id))
				.findOne(),
		[notification.reference_id]
	)

	const { data: phrase } = useLiveQuery(
		(q) =>
			suggestion ?
				q
					.from({ phrase: phrasesCollection })
					.where(({ phrase }) => eq(phrase.id, suggestion.phrase_id))
					.findOne()
			:	q
					.from({ phrase: phrasesCollection })
					.where(() => false)
					.findOne(),
		[suggestion?.phrase_id]
	)

	const respondToSuggestion = useRespondToSuggestion()

	const translation = phrase?.translations?.find(
		(t) => t.id === suggestion?.translation_id
	)

	const handleRespond = (status: 'accepted' | 'dismissed') => {
		if (!suggestion) return
		respondToSuggestion.mutate(
			{ suggestionId: suggestion.id, status },
			{
				onSuccess: () => {
					toastSuccess(
						status === 'accepted' ?
							'Suggestion accepted'
						:	'Suggestion dismissed'
					)
					onRead()
				},
			}
		)
	}

	return (
		<Card
			className={notification.is_read ? 'opacity-75' : 'border-primary/30'}
			data-testid="notification-card"
		>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-center gap-2">
						<MessageSquareWarning className="text-primary h-4 w-4 shrink-0" />
						<CardTitle className="text-sm font-medium">
							Correction suggested
						</CardTitle>
						{!notification.is_read && (
							<Badge variant="default" className="text-xs">
								New
							</Badge>
						)}
					</div>
					<span className="text-muted-foreground shrink-0 text-xs">
						{ago(notification.created_at)}
					</span>
				</div>
				{suggestion && (
					<CardDescription className="mt-1">
						<UidPermalinkInline
							uid={suggestion.uid}
							timeValue={suggestion.created_at}
						/>
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-3">
				{translation && (
					<div className="bg-muted rounded-lg p-3">
						<p className="text-muted-foreground mb-1 text-xs">
							Your translation:
						</p>
						<p className="text-sm">{translation.text}</p>
					</div>
				)}

				{suggestion && (
					<>
						<div>
							<p className="text-muted-foreground mb-1 text-xs">Comment:</p>
							<p className="text-sm">{suggestion.comment}</p>
						</div>

						{suggestion.text && (
							<div className="border-primary/20 rounded-lg border p-3">
								<p className="text-muted-foreground mb-1 text-xs">
									Suggested text:
								</p>
								<p className="text-sm font-medium">{suggestion.text}</p>
							</div>
						)}

						{phrase && (
							<p className="text-muted-foreground text-xs">
								On phrase:{' '}
								<Link
									to="/learn/$lang/phrases/$id"
									params={{ lang: phrase.lang, id: phrase.id }}
									className="s-link"
									onClick={onRead}
								>
									&ldquo;{phrase.text}&rdquo;
								</Link>
							</p>
						)}

						<Separator />

						{suggestion.status === 'pending' ?
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => handleRespond('dismissed')}
									disabled={respondToSuggestion.isPending}
								>
									Dismiss
								</Button>
								<Button
									size="sm"
									onClick={() => handleRespond('accepted')}
									disabled={respondToSuggestion.isPending}
								>
									<Check className="mr-1 h-3 w-3" />
									Accept
								</Button>
								{phrase && (
									<Button size="sm" variant="secondary" asChild>
										<Link
											to="/learn/$lang/phrases/$id"
											params={{ lang: phrase.lang, id: phrase.id }}
											onClick={onRead}
										>
											<Eye className="mr-1 h-3 w-3" />
											View phrase
										</Link>
									</Button>
								)}
							</div>
						:	<Badge
								variant={
									suggestion.status === 'accepted' ? 'default' : 'secondary'
								}
							>
								{suggestion.status === 'accepted' ? 'Accepted' : 'Dismissed'}
							</Badge>
						}
					</>
				)}
			</CardContent>
		</Card>
	)
}
