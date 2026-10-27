import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { BarChart3, Brain, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageMarker } from '@/components/ui/message'
import { MessageScroller } from '@/components/ui/message-scroller'
import { adminAuthor, crew, crewKeys, crewList } from '../../../shared/crew'
import {
	commonKnowledgeQuery,
	isWorking,
	markSeen,
	roomQuery,
	sitrepQuery,
} from '~/lib/crew'
import { AgentAvatar } from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { CommonKnowledgePanel } from '~/components/crew/common-knowledge-panel'
import { OverviewPanel } from '~/components/crew/overview-panel'
import { SitrepPanel } from '~/components/crew/sitrep-panel'
import { RoomCompose } from '~/components/crew/room-compose'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/')({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(roomQuery()),
			context.queryClient.ensureQueryData(commonKnowledgeQuery()),
			context.queryClient.ensureQueryData(sitrepQuery()),
		]),
	// Marks the room read on arrival and again on leaving, so messages that
	// arrive while the admin is here do not count as unread afterwards.
	onEnter: ({ context }) => void markSeen(context.queryClient, 'room', false),
	onLeave: ({ context }) => void markSeen(context.queryClient, 'room', true),
	component: CrewRoomPage,
})

type Panel = 'sitrep' | 'knowledge' | 'overview'

function CrewRoomPage() {
	const { session } = Route.useRouteContext()
	const { data: room } = useSuspenseQuery(roomQuery())
	// Captured once, so the "New since" line stays put while the admin reads.
	const [newSince] = useState(room.seenAt)
	// The Situation Report sits beside the room on a wide screen, since the
	// room is where the admin comes for the overview.
	const [panel, setPanel] = useState<Panel | null>(() =>
		window.matchMedia('(min-width: 64rem)').matches ? 'sitrep' : null
	)
	const toggle = (next: Panel) =>
		setPanel((open) => (open === next ? null : next))
	const working = crewKeys.filter((key) => isWorking(room.statuses[key]))
	const active = crewList.filter((member) => member.active).length

	return (
		<div className="flex h-full min-h-0">
			<section className="@container flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3">
					<MobileSidebarButton />
					<AgentAvatar agent="crew" />
					<div className="me-auto min-w-0">
						<h1 className="truncate leading-tight font-semibold">
							Common Room
						</h1>
						<p className="text-muted-foreground truncate text-xs">
							You and {active} agents, {crewList.length - active} more planned
						</p>
					</div>
					<Button
						variant="ghost"
						data-testid="sitrep-button"
						aria-pressed={panel === 'sitrep'}
						onClick={() => toggle('sitrep')}
					>
						<ClipboardList />{' '}
						<span className="@max-3xl:sr-only">Situation Report</span>
					</Button>
					<Button
						variant="ghost"
						data-testid="common-knowledge-button"
						aria-pressed={panel === 'knowledge'}
						onClick={() => toggle('knowledge')}
					>
						<Brain /> <span className="@max-3xl:sr-only">Common Knowledge</span>
					</Button>
					<Button
						variant="ghost"
						data-testid="crew-overview-button"
						aria-pressed={panel === 'overview'}
						onClick={() => toggle('overview')}
					>
						<BarChart3 /> <span className="@max-3xl:sr-only">Overview</span>
					</Button>
				</header>
				<MessageScroller dependency={room.messages.length + working.length}>
					{room.messages.length ? (
						<RoomTimeline
							messages={room.messages}
							myAuthor={adminAuthor(session.user.id)}
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
			{panel && (
				<div
					className={cn(
						'max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40',
						'md:shrink-0'
					)}
				>
					{panel === 'sitrep' && <SitrepPanel onClose={() => setPanel(null)} />}
					{panel === 'knowledge' && (
						<CommonKnowledgePanel onClose={() => setPanel(null)} />
					)}
					{panel === 'overview' && (
						<OverviewPanel onClose={() => setPanel(null)} />
					)}
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
			<h2 className="text-xl font-semibold">Common Room</h2>
			<p className="text-muted-foreground text-sm">
				The whole crew reads this room. Write @ and a name to ask someone; Riker
				and Data bring what needs you to the Enterprise. USS Product posts after
				its daily run. A message that ends in “...” waits for your next one.
			</p>
		</div>
	)
}
