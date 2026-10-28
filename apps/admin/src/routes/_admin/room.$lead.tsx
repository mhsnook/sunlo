import { useState } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { NotebookText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageMarker } from '@/components/ui/message'
import { MessageScroller } from '@/components/ui/message-scroller'
import {
	adminAuthor,
	crew,
	displayName,
	isLeadKey,
	placeOf,
	roomMembers,
	roomNames,
	type LeadKey,
} from '../../../shared/crew'
import {
	commandQuery,
	isWorking,
	markSeen,
	roomQuery,
	threadQuery,
	workspaceQuery,
} from '~/lib/crew'
import { AgentAvatar } from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { LeadRoomCompose } from '~/components/crew/lead-room-compose'
import { RoomPanel } from '~/components/crew/room-panel'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/room/$lead')({
	params: {
		parse: ({ lead }) => {
			if (!isLeadKey(lead)) throw notFound()
			return { lead }
		},
	},
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(threadQuery(params.lead)),
			context.queryClient.ensureQueryData(roomQuery()),
			...(params.lead === 'riker'
				? [context.queryClient.ensureQueryData(commandQuery())]
				: []),
			...roomMembers(params.lead).map((agent) =>
				context.queryClient.ensureQueryData(workspaceQuery(agent))
			),
		]),
	onEnter: ({ context, params }) =>
		void markSeen(context.queryClient, placeOf(params.lead), false),
	onLeave: ({ context, params }) =>
		void markSeen(context.queryClient, placeOf(params.lead), true),
	component: LeadRoomPage,
})

function LeadRoomPage() {
	const { lead } = Route.useParams()
	// A new room is a new page: the "New since" line and the panel start over.
	return <LeadRoom key={lead} lead={lead} />
}

// A lead's room: one thread with the lead and its advisor, where everything
// that needs the admin arrives as a card.
function LeadRoom({ lead }: { lead: LeadKey }) {
	const { session } = Route.useRouteContext()
	const { data: thread } = useSuspenseQuery(threadQuery(lead))
	const { data: room } = useSuspenseQuery(roomQuery())
	const [newSince] = useState(thread.seenAt)
	// The panel sits beside the thread on a wide screen and covers it on a phone.
	const [panelOpen, setPanelOpen] = useState(
		() => window.matchMedia('(min-width: 64rem)').matches
	)
	const members = roomMembers(lead)
	const working = members.filter((key) => isWorking(room.statuses[key]))

	return (
		<div className="flex h-full min-h-0">
			<section className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3">
					<MobileSidebarButton />
					<AgentAvatar agent={lead} />
					<div className="me-auto min-w-0">
						<h1 className="truncate leading-tight font-semibold">
							{roomNames[lead]}
						</h1>
						<p className="text-muted-foreground truncate text-xs">
							{members.map(displayName).join(', with ')}
						</p>
					</div>
					<Button
						variant="ghost"
						data-testid="room-panel-button"
						aria-pressed={panelOpen}
						onClick={() => setPanelOpen((open) => !open)}
					>
						<NotebookText /> <span className="max-sm:sr-only">Room log</span>
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
						<EmptyThread lead={lead} />
					)}
					{working.length > 0 && (
						<MessageMarker
							className="mx-auto max-w-3xl px-4 pb-4"
							data-testid="crew-working"
						>
							{working.map(displayName).join(' and ')}{' '}
							{working.length === 1 ? 'is' : 'are'} working…
						</MessageMarker>
					)}
				</MessageScroller>
				<LeadRoomCompose lead={lead} weekly={room.weekly} />
			</section>
			{panelOpen && (
				<div
					className={cn(
						'max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40',
						'md:shrink-0'
					)}
				>
					<RoomPanel lead={lead} onClose={() => setPanelOpen(false)} />
				</div>
			)}
		</div>
	)
}

function EmptyThread({ lead }: { lead: LeadKey }) {
	const members = roomMembers(lead)
	const advisors = members.filter((key) => key !== lead)
	return (
		<div className="mx-auto max-w-md space-y-3 px-4 pt-[15dvh] text-center">
			<div className="flex justify-center gap-1">
				{members.map((key) => (
					<AgentAvatar key={key} agent={key} size="sm" />
				))}
			</div>
			<h2 className="text-xl font-semibold">The {roomNames[lead]}</h2>
			<p className="text-muted-foreground text-sm">
				{crew[lead].active
					? `${displayName(lead)} answers what you write here${advisors.length ? `; write ${advisors.map((key) => `@${key}`).join(' or ')} to ask ${advisors.map(displayName).join(' or ')}` : ''}. Anything that needs you arrives here as a card.`
					: `${displayName(lead)} has not started yet. What you write here waits until it does.`}
			</p>
		</div>
	)
}
