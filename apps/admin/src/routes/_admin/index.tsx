import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MessageScroller } from '@/components/ui/message-scroller'
import {
	adminAuthor,
	crewKeys,
	crewList,
	displayName,
	principalOf,
	SITREP,
} from '../../../shared/crew'
import {
	commonKnowledgeQuery,
	documentQuery,
	documentsQuery,
	isWorking,
	markSeen,
	roomQuery,
} from '~/lib/crew'
import { AgentAvatar, WorkingMarker } from '~/components/crew/crew-parts'
import { LiveRuns, useLiveRuns } from '~/components/crew/run-steps'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { SidePanelSlot, useSidePanel } from '~/components/crew/side-panel'
import { CREW, DetailsPanel } from '~/components/crew/details-panel'
import { RoomCompose } from '~/components/crew/room-compose'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/')({
	loader: ({ context }) =>
		Promise.all([
			context.queryClient.ensureQueryData(roomQuery()),
			context.queryClient.ensureQueryData(commonKnowledgeQuery()),
			context.queryClient
				.ensureQueryData(documentsQuery('command'))
				.then((documents) => {
					const sitrep = documents.find((doc) => doc.name === SITREP)
					return (
						sitrep &&
						context.queryClient.ensureQueryData(documentQuery(sitrep.id))
					)
				}),
		]),
	// Marks the room read on arrival and again on leaving, so messages that
	// arrive while the admin is here do not count as unread afterwards.
	onEnter: ({ context }) => void markSeen(context.queryClient, 'room', false),
	onLeave: ({ context }) => void markSeen(context.queryClient, 'room', true),
	component: CrewRoomPage,
})

function CrewRoomPage() {
	const { session } = Route.useRouteContext()
	const { data: room } = useSuspenseQuery(roomQuery())
	// Captured once, so the "New since" line stays put while the admin reads.
	const [newSince] = useState(room.seenAt)
	// The details, with the Situation Report first, sit beside the room on a
	// wide screen, since the room is where the admin comes for the overview.
	const [panel, setPanel] = useSidePanel('details')
	const panelOpen = panel !== null
	const working = crewKeys.filter((key) => isWorking(room.statuses[key]))
	const liveRuns = useLiveRuns(crewKeys)
	const liveSteps = liveRuns.reduce((sum, run) => sum + run.steps.length, 0)
	const active = crewList.filter((member) => member.active).length
	const myAuthor = adminAuthor(session.user.id)

	return (
		<div className="flex h-full min-h-0">
			<section className="@container flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-2 border-b px-4 py-3 @3xl:gap-3">
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
						data-testid="details-button"
						className="@max-sm:px-2.5"
						aria-pressed={panelOpen}
						onClick={() => setPanel((open) => (open ? null : 'details'))}
					>
						<Info /> <span className="@max-sm:sr-only">Details</span>
					</Button>
				</header>
				<MessageScroller
					dependency={room.messages.length + working.length + liveSteps}
				>
					{room.messages.length ? (
						<RoomTimeline
							messages={room.messages}
							myAuthor={myAuthor}
							newSince={newSince}
						/>
					) : (
						<EmptyRoom />
					)}
					<WorkingMarker agents={working} />
					<LiveRuns runs={liveRuns} />
				</MessageScroller>
				<RoomCompose myAuthor={myAuthor} />
			</section>
			{panelOpen && (
				<SidePanelSlot>
					<DetailsPanel room={CREW} onClose={() => setPanel(null)} />
				</SidePanelSlot>
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
				The whole crew reads this room. Write @ and a name to ask someone, or a
				room's name to ask whoever runs it. Each subject has a room of its own,
				where what needs you arrives. {displayName(principalOf('product'))}{' '}
				posts here after its daily run. A message that ends in “...” waits for
				your next one.
			</p>
		</div>
	)
}
