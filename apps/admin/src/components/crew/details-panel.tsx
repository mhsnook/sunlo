import { Suspense, useState, type ReactNode } from 'react'
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from '@tanstack/react-query'
import { ArrowLeft, CheckCheck, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Loader } from '@/components/ui/loader'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion'
import { useIsMobile } from '@/hooks/use-mobile'
import {
	crew,
	crewKeys,
	displayName,
	principalOf,
	roomMembers,
	roomNames,
	SITREP,
	type CrewKey,
	type DocumentSummaryType,
	type OpenItemType,
	type RoomKey,
} from '../../../shared/crew'
import {
	documentQuery,
	documentsQuery,
	isWorking,
	roomQuery,
	useCloseOpenItem,
	useEditOpenItem,
	workspaceQuery,
} from '~/lib/crew'
import { dayLabel } from '~/lib/format'
import { CharacterEditor } from './character-editor'
import { CharterPanel, WeeklySettings } from './charter-panel'
import { CrewCharterSection } from './common-knowledge-panel'
import { DocumentView } from './document-view'
import { AgentAvatar, ChangeCard, RoomCard } from './crew-parts'
import { EditableEntry } from './editable-entry'
import { MemoryList } from './memory-list'
import { OverviewSection } from './overview-panel'
import { PainterStyles } from './painter-styles'
import { Empty, Section, TodoList } from './workspace-parts'
import { SidePanel } from './side-panel'

// The Common Room, which is not a room in `roomKeys`.
export const CREW = 'crew'
export type DetailsRoom = RoomKey | typeof CREW

const roomTitle = (room: DetailsRoom) =>
	room === CREW ? 'the crew' : `the ${roomNames[room]}`

// Beside a timeline, the same sections for every room: its documents, with
// the Situation Report pinned first since every agent reads it; its charter
// (the crew's, in the Common Room); its members, each with to-dos, what is
// open with the admin, and memory; then the room's own settings. On a phone
// the sections fold, with the documents open. A document opens in the panel
// itself.
export function DetailsPanel({
	room,
	onClose,
}: {
	room: DetailsRoom
	onClose: () => void
}) {
	const { data: command } = useSuspenseQuery(documentsQuery('command'))
	const { data: own } = useSuspenseQuery(
		documentsQuery(room === CREW ? 'command' : room)
	)
	const sitrep = command.find((doc) => doc.name === SITREP)
	const documents =
		room === CREW
			? sitrep
				? [sitrep]
				: []
			: room === 'command'
				? own.toSorted((a, b) =>
						a.name === SITREP ? -1 : b.name === SITREP ? 1 : 0
					)
				: sitrep
					? [sitrep, ...own]
					: own
	const [openId, setOpenId] = useState<number | null>(null)
	const open = documents.find((doc) => doc.id === openId)
	const members = room === CREW ? crewKeys : roomMembers(room)

	if (open) {
		return (
			<SidePanel
				title={open.name}
				label={`${open.name}, in ${roomTitle(room)}'s details`}
				testId="details-panel"
				testKey={room}
				onClose={onClose}
				wide
				actions={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Back to the details"
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

	const sections: Array<{ key: string; title: string; content: ReactNode }> = [
		{
			key: 'documents',
			title: 'Documents',
			content: <DocumentList documents={documents} onOpen={setOpenId} />,
		},
		{
			key: 'charter',
			title: 'Charter',
			content:
				room === CREW ? <CrewCharterSection /> : <CharterPanel room={room} />,
		},
		...(room === 'command'
			? [
					{
						key: 'weekly',
						title: 'Weekly meeting',
						content: <WeeklySettings />,
					},
				]
			: []),
		...members.map((agent) => ({
			key: agent,
			title: displayName(agent),
			content: (
				<Suspense fallback={<Loader className="mx-auto my-6 opacity-50" />}>
					<MemberLog agent={agent} />
				</Suspense>
			),
		})),
		...(room === CREW
			? [{ key: 'overview', title: 'Overview', content: <OverviewSection /> }]
			: []),
		...(room === crew['product-2'].room
			? [
					{
						key: 'painter-styles',
						title: 'Painter styles',
						content: (
							<Suspense
								fallback={<Loader className="mx-auto my-6 opacity-50" />}
							>
								<PainterStyles />
							</Suspense>
						),
					},
				]
			: []),
	]

	return (
		<SidePanel
			title="Details"
			label={`About ${roomTitle(room)}`}
			testId="details-panel"
			testKey={room}
			onClose={onClose}
		>
			<DetailsSections sections={sections} />
		</SidePanel>
	)
}

// Plain stacked sections on a wide screen; an accordion on a phone, where
// the panel covers the room and the sections together run long.
function DetailsSections({
	sections,
}: {
	sections: Array<{ key: string; title: string; content: ReactNode }>
}) {
	const isMobile = useIsMobile()
	if (!isMobile) {
		return (
			<div className="space-y-8">
				{sections.map((section) => (
					<div
						key={section.key}
						data-testid="details-section"
						data-key={section.key}
					>
						{section.content}
					</div>
				))}
			</div>
		)
	}
	return (
		<Accordion defaultValue={['documents']} className="-mt-4">
			{sections.map((section) => (
				<AccordionItem
					key={section.key}
					value={section.key}
					data-testid="details-section"
					data-key={section.key}
				>
					<AccordionTrigger>{section.title}</AccordionTrigger>
					<AccordionContent className="text-base">
						{section.content}
					</AccordionContent>
				</AccordionItem>
			))}
		</Accordion>
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
			{workspace.character && (
				<CharacterEditor agent={agent} character={workspace.character} />
			)}
			<Section title={`${name}'s to-dos`}>
				{!workspace.todos.length && <Empty>Nothing on {name}'s list.</Empty>}
				<TodoList agent={agent} todos={workspace.todos} />
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
							<OpenItems agent={agent} items={workspace.openItems} />
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

function OpenItems({
	agent,
	items,
}: {
	agent: CrewKey
	items: Array<OpenItemType>
}) {
	const edit = useEditOpenItem(agent)
	const close = useCloseOpenItem(agent)
	return (
		<ul className="bg-card divide-y rounded border">
			{items.map((item) => (
				<EditableEntry
					key={item.id}
					id={item.id}
					text={item.title}
					label="Open item"
					busy={edit.isPending || close.isPending}
					onSave={(title) => edit.mutateAsync({ id: item.id, title })}
					onDelete={() => close.mutateAsync(item.id)}
					deleteLabel="Close this item"
					deleteIcon={<CheckCheck />}
					quiet
					className="px-4 py-2.5"
					testId="agent-open-item"
				>
					{item.title}
					{item.tag && (
						<span className="text-muted-foreground ms-2 text-xs">
							{item.tag}
						</span>
					)}
				</EditableEntry>
			))}
		</ul>
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
