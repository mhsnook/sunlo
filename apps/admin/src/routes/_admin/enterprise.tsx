import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { NotebookText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageMarker } from '@/components/ui/message'
import { MessageScroller } from '@/components/ui/message-scroller'
import { adminAuthor, bridgeKeys, crew } from '../../../shared/crew'
import {
	enterpriseQuery,
	isWorking,
	markSeen,
	roomQuery,
	workspaceQuery,
} from '~/lib/crew'
import { AgentAvatar } from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { EnterpriseCompose } from '~/components/crew/enterprise-compose'
import { ShipsLog } from '~/components/crew/ships-log'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/enterprise')({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(enterpriseQuery()),
			context.queryClient.ensureQueryData(roomQuery()),
			...bridgeKeys.map((agent) =>
				context.queryClient.ensureQueryData(workspaceQuery(agent))
			),
		]),
	onEnter: ({ context }) => markSeen(context.queryClient, 'bridge', false),
	onLeave: ({ context }) => markSeen(context.queryClient, 'bridge', true),
	component: EnterprisePage,
})

// The admin's own ship: one thread with Riker, their first officer, and
// Data, where everything that needs the admin arrives as a card.
function EnterprisePage() {
	const { session } = Route.useRouteContext()
	const { data: thread } = useSuspenseQuery(enterpriseQuery())
	const { data: room } = useSuspenseQuery(roomQuery())
	const [newSince] = useState(thread.seenAt)
	// The log sits beside the thread on a wide screen and covers it on a phone.
	const [logOpen, setLogOpen] = useState(
		() => window.matchMedia('(min-width: 64rem)').matches
	)
	const working = bridgeKeys.filter((key) => isWorking(room.statuses[key]))

	return (
		<div className="flex h-full min-h-0">
			<section className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3">
					<MobileSidebarButton />
					<AgentAvatar agent="enterprise" />
					<div className="me-auto">
						<h1 className="leading-tight font-semibold">Enterprise</h1>
						<p className="text-muted-foreground text-xs">
							Riker, your first officer, and Data
						</p>
					</div>
					<Button
						variant="ghost"
						data-testid="enterprise-log-button"
						aria-pressed={logOpen}
						onClick={() => setLogOpen((open) => !open)}
					>
						<NotebookText /> <span className="max-sm:sr-only">Ship’s log</span>
					</Button>
				</header>
				<MessageScroller dependency={thread.messages.length + working.length}>
					{thread.messages.length ? (
						<RoomTimeline
							messages={thread.messages}
							myAuthor={adminAuthor(session.user.id)}
							newSince={newSince}
						/>
					) : (
						<EmptyThread />
					)}
					{working.length > 0 && (
						<MessageMarker
							className="mx-auto max-w-3xl px-4 pb-4"
							data-testid="crew-working"
						>
							{working.map((key) => crew[key].name).join(' and ')}{' '}
							{working.length === 1 ? 'is' : 'are'} working…
						</MessageMarker>
					)}
				</MessageScroller>
				<EnterpriseCompose weekly={room.weekly} />
			</section>
			{logOpen && (
				<div
					className={cn(
						'max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40',
						'md:shrink-0'
					)}
				>
					<ShipsLog onClose={() => setLogOpen(false)} />
				</div>
			)}
		</div>
	)
}

function EmptyThread() {
	return (
		<div className="mx-auto max-w-md space-y-3 px-4 pt-[15dvh] text-center">
			<div className="flex justify-center gap-1">
				{bridgeKeys.map((key) => (
					<AgentAvatar key={key} agent={key} size="sm" />
				))}
			</div>
			<h2 className="text-xl font-semibold">The Enterprise</h2>
			<p className="text-muted-foreground text-sm">
				Riker answers what you write here; write @Data to ask Data. Anything
				that needs you, from a decision to the weekly brief, arrives here as a
				card.
			</p>
		</div>
	)
}
