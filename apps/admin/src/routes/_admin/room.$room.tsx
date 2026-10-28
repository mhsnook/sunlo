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
	isRoomKey,
	placeOf,
	principalOf,
	roomMembers,
	roomNames,
	type RoomKey,
} from '../../../shared/crew'
import {
	commandQuery,
	isWorking,
	markSeen,
	roomQuery,
	threadQuery,
	workspaceQuery,
} from '~/lib/crew'
import { RoomAvatar } from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { RoomThreadCompose } from '~/components/crew/room-thread-compose'
import { RoomPanel } from '~/components/crew/room-panel'
import { RoomTimeline } from '~/components/crew/room-timeline'

export const Route = createFileRoute('/_admin/room/$room')({
	params: {
		parse: ({ room }) => {
			if (!isRoomKey(room)) throw notFound()
			return { room }
		},
	},
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(threadQuery(params.room)),
			context.queryClient.ensureQueryData(roomQuery()),
			...(params.room === 'command'
				? [context.queryClient.ensureQueryData(commandQuery())]
				: []),
			...roomMembers(params.room).map((agent) =>
				context.queryClient.ensureQueryData(workspaceQuery(agent))
			),
		]),
	onEnter: ({ context, params }) =>
		void markSeen(context.queryClient, placeOf(params.room), false),
	onLeave: ({ context, params }) =>
		void markSeen(context.queryClient, placeOf(params.room), true),
	component: SubjectRoomPage,
})

function SubjectRoomPage() {
	const { room } = Route.useParams()
	// A new room is a new page: the "New since" line and the panel start over.
	return <SubjectRoom key={room} room={room} />
}

// One subject's room: a thread with the officer who runs it, and anyone who
// works there with them, where everything that needs the admin arrives as a
// card.
function SubjectRoom({ room }: { room: RoomKey }) {
	const { session } = Route.useRouteContext()
	const { data: thread } = useSuspenseQuery(threadQuery(room))
	const { data: crewRoom } = useSuspenseQuery(roomQuery())
	const [newSince] = useState(thread.seenAt)
	// The panel sits beside the thread on a wide screen and covers it on a phone.
	const [panelOpen, setPanelOpen] = useState(
		() => window.matchMedia('(min-width: 64rem)').matches
	)
	const members = roomMembers(room)
	const working = members.filter((key) => isWorking(crewRoom.statuses[key]))

	return (
		<div className="flex h-full min-h-0">
			<section className="flex min-w-0 flex-1 flex-col">
				<header className="flex items-center gap-3 border-b px-4 py-3">
					<MobileSidebarButton />
					<RoomAvatar room={room} />
					<div className="me-auto min-w-0">
						<h1 className="truncate leading-tight font-semibold">
							{roomNames[room]}
						</h1>
						<p className="text-muted-foreground truncate text-xs">
							{members.map(displayName).join(' and ')}
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
						<EmptyThread room={room} />
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
				<RoomThreadCompose room={room} weekly={crewRoom.weekly} />
			</section>
			{panelOpen && (
				<div
					className={cn(
						'max-md:bg-background max-md:fixed max-md:inset-0 max-md:z-40',
						'md:shrink-0'
					)}
				>
					<RoomPanel room={room} onClose={() => setPanelOpen(false)} />
				</div>
			)}
		</div>
	)
}

function EmptyThread({ room }: { room: RoomKey }) {
	const members = roomMembers(room)
	const principal = principalOf(room)
	const associates = members.filter((key) => key !== principal)
	return (
		<div className="mx-auto max-w-md space-y-3 px-4 pt-[15dvh] text-center">
			<div className="flex justify-center">
				<RoomAvatar room={room} size="lg" />
			</div>
			<h2 className="text-xl font-semibold">The {roomNames[room]}</h2>
			<p className="text-muted-foreground text-sm">
				{crew[principal].active
					? `${displayName(principal)} answers what you write here${associates.length ? `; write ${associates.map((key) => `@${key}`).join(' or ')} to ask ${associates.map(displayName).join(' or ')}` : ''}. Anything that needs you arrives here as a card.`
					: `${displayName(principal)} has not started yet. What you write here waits until they do.`}
			</p>
		</div>
	)
}
