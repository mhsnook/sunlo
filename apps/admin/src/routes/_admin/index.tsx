import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageMarker } from '@/components/ui/message'
import { MessageScroller } from '@/components/ui/message-scroller'
import { crew, crewKeys } from '../../../shared/crew'
import { isWorking, markRoomSeen, roomQuery } from '~/lib/crew'
import { AgentAvatar } from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { OverviewPanel } from '~/components/crew/overview-panel'
import { RoomCompose } from '~/components/crew/room-compose'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/')({
	loader: ({ context }) => context.queryClient.ensureQueryData(roomQuery()),
	// Marks the room read on arrival and again on leaving, so messages that
	// arrive while the admin is here do not count as unread afterwards.
	onEnter: ({ context }) => markRoomSeen(context.queryClient, false),
	onLeave: ({ context }) => markRoomSeen(context.queryClient, true),
	component: CrewRoomPage,
})

function CrewRoomPage() {
	const { session } = Route.useRouteContext()
	const { data: room } = useSuspenseQuery(roomQuery())
	// Captured once, so the "New since" line stays put while the admin reads.
	const [newSince] = useState(room.seenAt)
	const [overviewOpen, setOverviewOpen] = useState(false)
	const working = crewKeys.filter((key) => isWorking(room.statuses[key]))

	return (
		<div className="flex h-full min-h-0">
			<section className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3">
					<MobileSidebarButton />
					<AgentAvatar agent="crew" />
					<div className="me-auto">
						<h1 className="leading-tight font-semibold">The crew</h1>
						<p className="text-muted-foreground text-xs">You and 6 agents</p>
					</div>
					<Button
						variant="ghost"
						data-testid="crew-overview-button"
						aria-pressed={overviewOpen}
						onClick={() => setOverviewOpen((open) => !open)}
					>
						<BarChart3 /> <span className="max-sm:sr-only">Overview</span>
					</Button>
				</header>
				<MessageScroller dependency={room.messages.length + working.length}>
					{room.messages.length ? (
						<RoomTimeline
							messages={room.messages}
							myAuthor={`admin:${session.user.id}`}
							newSince={newSince}
						/>
					) : (
						<EmptyRoom />
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
				<RoomCompose />
			</section>
			{overviewOpen && (
				<div
					className={cn(
						'max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40',
						'md:shrink-0'
					)}
				>
					<OverviewPanel onClose={() => setOverviewOpen(false)} />
				</div>
			)}
		</div>
	)
}

function EmptyRoom() {
	return (
		<div className="mx-auto max-w-md space-y-3 px-4 pt-[15dvh] text-center">
			<div className="flex justify-center gap-1">
				{crewKeys.map((key) => (
					<AgentAvatar key={key} agent={key} size="sm" />
				))}
			</div>
			<h2 className="text-xl font-semibold">The crew</h2>
			<p className="text-muted-foreground text-sm">
				Product posts here after its daily run at 07:00 UTC. Ask it something
				now with @Product, or write a note: a message that ends in “...” waits
				for your next one.
			</p>
		</div>
	)
}
