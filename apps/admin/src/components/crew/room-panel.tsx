import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	crew,
	displayName,
	principalOf,
	roomMembers,
	roomNames,
	type CrewKey,
	type RoomKey,
} from '../../../shared/crew'
import { isWorking, roomQuery, workspaceQuery } from '~/lib/crew'
import { CharterPanel } from './charter-panel'
import { AgentAvatar, CardActions, ChangeCard, CrewText } from './crew-parts'
import { MemoryList } from './memory-list'
import { SitrepLine } from './sitrep-panel'
import { Empty, Section, TodoList } from './workspace-parts'

// Beside a subject's room: who works there, and each officer's Situation
// Report lines, to-dos, what is open with the admin, and memory. The Command
// room also keeps the charter and the weekly settings here.
export function RoomPanel({
	room,
	onClose,
}: {
	room: RoomKey
	onClose: () => void
}) {
	return (
		<aside
			aria-label={`About the ${roomNames[room]}`}
			data-testid="room-panel"
			data-key={room}
			className="bg-background flex h-full w-full flex-col border-s md:w-96"
		>
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<h2 className="me-auto font-semibold">Room log</h2>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Close the room log"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			<div className="flex-1 space-y-8 overflow-y-auto px-4 py-4">
				{room === 'command' && <CharterPanel />}
				{roomMembers(room).map((agent) => (
					<MemberLog key={agent} agent={agent} />
				))}
			</div>
		</aside>
	)
}

function MemberLog({ agent }: { agent: CrewKey }) {
	const { data: workspace } = useSuspenseQuery(workspaceQuery(agent))
	const name = displayName(agent)
	const waiting = workspace.cards.filter((card) => !card.answer)
	const openCount = waiting.length + workspace.openItems.length
	return (
		<div className="space-y-5" data-testid="room-member" data-key={agent}>
			<ProfileCard agent={agent} />
			{crew[agent].tracks.length > 0 && (
				<Section title="Situation Report">
					<ul className="space-y-2">
						{crew[agent].tracks.map((track) => (
							<SitrepLine
								key={track}
								agent={agent}
								track={track}
								showTrack={crew[agent].tracks.length > 1}
								rows={agent === 'riker' ? 6 : undefined}
							/>
						))}
					</ul>
				</Section>
			)}
			<Section title={`${name}'s to-dos`}>
				{workspace.todos.length ? (
					<TodoList todos={workspace.todos} />
				) : (
					<Empty>Nothing on {name}'s list.</Empty>
				)}
			</Section>
			<Section title={`Open with you · ${openCount}`}>
				{openCount ? (
					<div className="space-y-3">
						{waiting.map((card) =>
							card.card?.kind === 'change' ? (
								<ChangeCard key={card.id} message={card} />
							) : (
								<div
									key={card.id}
									className="bg-card space-y-2 rounded border p-3 text-sm"
								>
									{card.card?.title && (
										<p className="font-semibold">{card.card.title}</p>
									)}
									<CrewText text={card.body} />
									<CardActions message={card} />
								</div>
							)
						)}
						{workspace.openItems.length > 0 && (
							<ul className="bg-card divide-y rounded border">
								{workspace.openItems.map((item) => (
									<li
										key={item.id}
										className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm"
										data-testid="agent-open-item"
										data-key={item.id}
									>
										<span>{item.title}</span>
										{item.tag && (
											<span className="text-muted-foreground text-xs">
												{item.tag}
											</span>
										)}
									</li>
								))}
							</ul>
						)}
					</div>
				) : (
					<Empty>Nothing is waiting on you.</Empty>
				)}
			</Section>
			<MemoryList agent={agent} memory={workspace.memory} />
		</div>
	)
}

function ProfileCard({ agent }: { agent: CrewKey }) {
	const { data: room } = useQuery(roomQuery())
	const member = crew[agent]
	const name = displayName(agent)
	return (
		<header className="bg-card @container rounded border shadow-xs">
			<div className="flex items-center gap-3 p-4">
				<AgentAvatar agent={agent} />
				<div className="min-w-0">
					<h3 className="font-semibold">
						{name}
						{member.role === 'associate' && (
							<span className="text-muted-foreground ms-2 text-xs font-normal">
								works with {displayName(principalOf(member.room))}
							</span>
						)}
					</h3>
					<p className="text-muted-foreground text-xs">
						{member.title}
						{member.schedule ? ` · ${member.schedule}` : ''}
						{isWorking(room?.statuses[agent]) ? ' · working now' : ''}
					</p>
				</div>
			</div>
			<div className="border-t px-4 py-3">
				<h4 className="text-muted-foreground mb-2 text-xs font-semibold">
					Looks after
				</h4>
				<ul className="space-y-2 text-sm" data-testid="agent-looks-after">
					{member.looksAfter.map((line) => (
						<li key={line} className="flex gap-2.5">
							<span
								aria-hidden
								className="bg-primary-400 mt-2 size-1.5 shrink-0 rounded-full"
							/>
							{line}
						</li>
					))}
				</ul>
			</div>
			{!member.active && (
				<p
					className="text-muted-foreground border-t px-4 py-3 text-sm"
					data-testid="agent-not-started"
				>
					{name} has not started yet. Messages for {name} wait here until it
					does.
				</p>
			)}
		</header>
	)
}
