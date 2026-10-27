import type { ReactNode } from 'react'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { crew, isCrewKey, meetingDue } from '../../../shared/crew'
import { isWorking, roomQuery, stackQuery, workspaceQuery } from '~/lib/crew'
import { CharterPanel } from '~/components/crew/charter-panel'
import { MemoryList } from '~/components/crew/memory-list'
import { AgentChat } from '~/components/crew/agent-chat'
import {
	AgentAvatar,
	CardActions,
	ChangeCard,
	CrewText,
} from '~/components/crew/crew-parts'
import { dayLabel } from '~/lib/format'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'

export const Route = createFileRoute('/_admin/crew/$agent')({
	params: {
		parse: ({ agent }) => {
			if (!isCrewKey(agent)) throw notFound()
			return { agent }
		},
	},
	loader: ({ context, params }) =>
		Promise.all([
			context.queryClient.ensureQueryData(workspaceQuery(params.agent)),
			params.agent === 'riker'
				? context.queryClient.ensureQueryData(stackQuery())
				: null,
		]),
	component: WorkspacePage,
})

function WorkspacePage() {
	const { agent } = Route.useParams()
	const { session } = Route.useRouteContext()
	const { data: workspace } = useSuspenseQuery(workspaceQuery(agent))
	const { data: room } = useQuery(roomQuery())
	const member = crew[agent]
	const waiting = workspace.cards.filter((card) => !card.answer)
	const openCount = waiting.length + workspace.openItems.length

	return (
		<div className="bg-primary-50/40 min-h-full">
			<div className="px-4 py-6 md:px-8 md:pe-[26rem]">
				<div className="max-w-3xl space-y-8">
					<header className="flex items-center gap-4">
						<MobileSidebarButton />
						<AgentAvatar agent={agent} size="lg" />
						<div>
							<h1 className="text-2xl font-semibold">{member.name}</h1>
							<p className="text-muted-foreground text-sm">
								{member.title}
								{member.schedule ? ` · ${member.schedule}` : ''}
								{isWorking(room?.statuses[agent]) ? ' · working now' : ''}
							</p>
						</div>
					</header>

					{!member.active && (
						<p
							className="bg-card rounded border p-4 text-sm"
							data-testid="agent-not-started"
						>
							{member.name} has not started yet. Messages for {member.name} stay
							in the crew room until it does.
						</p>
					)}

					{agent === 'riker' && <CharterPanel />}

					<Section title="Looks after">
						<ul className="space-y-1">
							{member.looksAfter.map((line) => (
								<li key={line}>{line}</li>
							))}
						</ul>
					</Section>

					<Section title="To-do">
						{workspace.todos.length ? (
							<ul className="space-y-3" data-testid="agent-todos">
								{workspace.todos.map((todo) => (
									<li
										key={todo.id}
										className="flex gap-3"
										data-testid="agent-todo"
										data-key={todo.id}
									>
										<span
											aria-label={todo.done ? 'Done' : 'Not done'}
											className={cn(
												'mt-0.5 grid size-5 shrink-0 place-items-center rounded border',
												todo.done &&
													'bg-primary-700 border-primary-700 text-paper'
											)}
										>
											{todo.done && <Check className="size-3.5" />}
										</span>
										<span>
											<span
												className={cn(
													todo.done && 'text-muted-foreground line-through'
												)}
											>
												{todo.text}
											</span>
											{(todo.note || todo.doneAt) && (
												<span className="text-muted-foreground block text-xs">
													{todo.done && todo.doneAt
														? `Done ${dayLabel(todo.doneAt)}`
														: todo.note}
												</span>
											)}
										</span>
									</li>
								))}
							</ul>
						) : (
							<Empty>Nothing on {member.name}'s list.</Empty>
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
												className="flex items-baseline justify-between gap-3 px-4 py-2.5"
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
			</div>
			{member.active && (
				<AgentChat
					key={agent}
					agent={agent}
					uid={session.user.id}
					starter={
						agent === 'riker' && room && meetingDue(room.weekly)
							? {
									label: 'Start the weekly meeting',
									message: "Let's have our weekly meeting.",
								}
							: undefined
					}
				/>
			)}
		</div>
	)
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="space-y-2">
			<h2 className="text-muted-foreground text-sm font-semibold">{title}</h2>
			{children}
		</section>
	)
}

function Empty({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground text-sm">{children}</p>
}
