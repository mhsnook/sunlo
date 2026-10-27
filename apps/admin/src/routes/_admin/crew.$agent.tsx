import { createFileRoute, notFound } from '@tanstack/react-router'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { crew, fleetKeys, type CrewKey } from '../../../shared/crew'
import { isWorking, roomQuery, workspaceQuery } from '~/lib/crew'
import { MemoryList } from '~/components/crew/memory-list'
import { AgentChat } from '~/components/crew/agent-chat'
import {
	AgentAvatar,
	CardActions,
	ChangeCard,
	CrewText,
} from '~/components/crew/crew-parts'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'
import { Empty, Section, TodoList } from '~/components/crew/workspace-parts'

export const Route = createFileRoute('/_admin/crew/$agent')({
	params: {
		// Fleet ships only: Riker and Data live on the Enterprise.
		parse: ({ agent }) => {
			const ship = fleetKeys.find((key): key is CrewKey => key === agent)
			if (!ship) throw notFound()
			return { agent: ship }
		},
	},
	loader: ({ context, params }) =>
		context.queryClient.ensureQueryData(workspaceQuery(params.agent)),
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
					<header className="bg-card @container rounded border shadow-xs">
						<div className="flex items-center gap-4 p-5">
							<MobileSidebarButton />
							<AgentAvatar agent={agent} size="lg" />
							<div className="min-w-0">
								<h1 className="text-2xl font-semibold">{member.name}</h1>
								<p className="text-muted-foreground text-sm">
									{member.title}
									{member.schedule ? ` · ${member.schedule}` : ''}
									{isWorking(room?.statuses[agent]) ? ' · working now' : ''}
								</p>
							</div>
						</div>
						<div className="border-t px-5 py-4">
							<h2 className="text-muted-foreground mb-3 text-xs font-semibold">
								Looks after
							</h2>
							<ul
								className="grid gap-x-8 gap-y-2.5 text-sm @xl:grid-cols-2"
								data-testid="agent-looks-after"
							>
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
								className="text-muted-foreground border-t px-5 py-3 text-sm"
								data-testid="agent-not-started"
							>
								{member.name} has not started yet. Messages for {member.name}{' '}
								stay in the Common Room until it does.
							</p>
						)}
					</header>

					<Section title="To-do">
						{workspace.todos.length ? (
							<TodoList todos={workspace.todos} />
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
				<AgentChat key={agent} agent={agent} uid={session.user.id} />
			)}
		</div>
	)
}
