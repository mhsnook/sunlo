import { Suspense, useState } from 'react'
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
	crew,
	displayName,
	principalOf,
	roomMembers,
	roomNames,
	type CrewKey,
	type DocumentSummaryType,
	type RoomKey,
} from '../../../shared/crew'
import {
	documentQuery,
	documentsQuery,
	isWorking,
	roomQuery,
	workspaceQuery,
} from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { CharterPanel } from './charter-panel'
import { DocumentView } from './document-view'
import { AgentAvatar, ChangeCard, RoomCard } from './crew-parts'
import { MemoryList } from './memory-list'
import { Empty, Section, TodoList } from './workspace-parts'
import { SidePanel } from './side-panel'

// Beside a subject's room: its documents, then who works there, with each
// officer's to-dos, what is open with the admin, and memory. The Command room
// also keeps the charter and the weekly settings here. A document opens in
// the panel itself.
export function RoomPanel({
	room,
	onClose,
}: {
	room: RoomKey
	onClose: () => void
}) {
	const { data: documents } = useSuspenseQuery(documentsQuery(room))
	const [openId, setOpenId] = useState<number | null>(null)
	const open = documents.find((doc) => doc.id === openId)

	if (open) {
		return (
			<SidePanel
				title={open.name}
				label={`${open.name}, in the ${roomNames[room]}`}
				testId="room-panel"
				testKey={room}
				onClose={onClose}
				wide
				actions={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Back to the room log"
						data-testid="document-back"
						onClick={() => setOpenId(null)}
					>
						<ArrowLeft />
					</Button>
				}
			>
				<Suspense fallback={<Loader className="mx-auto mt-10 opacity-50" />}>
					<DocumentView id={open.id} showName={false} />
				</Suspense>
			</SidePanel>
		)
	}
	return (
		<SidePanel
			title="Room log"
			label={`About the ${roomNames[room]}`}
			testId="room-panel"
			testKey={room}
			onClose={onClose}
			bodyClassName="space-y-8"
		>
			<DocumentList documents={documents} onOpen={setOpenId} />
			{room === 'command' && <CharterPanel />}
			{roomMembers(room).map((agent) => (
				<MemberLog key={agent} agent={agent} />
			))}
		</SidePanel>
	)
}

function DocumentList({
	documents,
	onOpen,
}: {
	documents: Array<DocumentSummaryType>
	onOpen: (id: number) => void
}) {
	const queryClient = useQueryClient()
	return (
		<Section title="Documents">
			{documents.length ? (
				<ul className="bg-card divide-y rounded border">
					{documents.map((doc) => (
						<li key={doc.id}>
							<button
								type="button"
								className="hover:bg-muted flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm"
								data-testid="room-document"
								data-key={doc.name}
								onPointerEnter={() =>
									void queryClient.prefetchQuery(documentQuery(doc.id))
								}
								onClick={() => onOpen(doc.id)}
							>
								<FileText className="text-muted-foreground size-4 shrink-0" />
								<span className="me-auto">{doc.name}</span>
								<span className="text-muted-foreground text-xs">
									{doc.at
										? `Revision ${doc.revision}, ${dayLabel(doc.at)}`
										: 'Not written yet'}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : (
				<Empty>This room keeps no documents yet.</Empty>
			)}
		</Section>
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
								<RoomCard key={card.id} message={card} />
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
