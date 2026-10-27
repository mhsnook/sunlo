import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import { crew, type StackItemType } from '../../../shared/crew'
import { stackQuery, useAnswerStack } from '~/lib/crew'
import { AgentAvatar, CrewText } from '~/components/crew/crew-parts'
import { dayLabel, timeLabel } from '~/lib/format'
import { MobileSidebarButton } from '~/components/crew/crew-sidebar'

export const Route = createFileRoute('/_admin/stack')({
	loader: ({ context }) => context.queryClient.ensureQueryData(stackQuery()),
	component: StackPage,
})

const kindLabels: Record<StackItemType['kind'], string> = {
	brief: 'Weekly brief',
	decide: 'Your call · on hold',
	confirm: 'Done in your stead · confirm',
	escalate: 'Needs more than the crew has',
	charter: 'For the charter',
	know: 'Worth knowing',
}

// Calls that hold something up come first.
const kindOrder: Array<StackItemType['kind']> = [
	'decide',
	'confirm',
	'escalate',
	'charter',
	'brief',
	'know',
]

function StackPage() {
	const { data: stack } = useSuspenseQuery(stackQuery())
	const open = stack.items
		.filter((item) => item.status === 'open')
		.toSorted((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind))
	const done = stack.items.filter((item) => item.status === 'done')

	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
			<header className="flex items-center gap-3">
				<MobileSidebarButton />
				<AgentAvatar agent="stack" size="lg" />
				<div>
					<h1 className="text-2xl font-semibold">Brought to you</h1>
					<p className="text-muted-foreground text-sm">
						What Riker and Data need from you. You can skip the room and just
						clear this.
					</p>
				</div>
			</header>
			{open.length ? (
				<ul className="space-y-3" data-testid="stack-open">
					{open.map((item) => (
						<StackCard key={item.id} item={item} />
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-sm">
					Nothing is waiting on you.
				</p>
			)}
			{done.length > 0 && (
				<section className="space-y-2">
					<h2 className="text-muted-foreground text-sm font-semibold">
						Done in the last two weeks
					</h2>
					<ul className="space-y-2">
						{done.map((item) => (
							<li
								key={item.id}
								className="text-muted-foreground flex gap-2 text-sm"
								data-testid="stack-done"
								data-key={item.id}
							>
								<span className="text-foreground">{item.title}</span>
								<span>· {item.answer?.label}</span>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	)
}

// What a brief or a "know" item offers: it has nothing to answer.
const done = { id: 'done', label: 'Done' }

function StackCard({ item }: { item: StackItemType }) {
	const answer = useAnswerStack()
	const [note, setNote] = useState('')
	const [expanded, setExpanded] = useState(item.kind !== 'brief')
	const respond = (actionId: string) =>
		answer.mutate(
			{ id: item.id, actionId, note: note.trim() || null },
			{ onError: (error) => toastError(error.message) }
		)
	return (
		<li
			className={cn(
				'bg-card space-y-3 rounded border p-4',
				item.kind === 'decide' && 'border-primary-400'
			)}
			data-testid="stack-item"
			data-key={item.id}
		>
			<div className="flex items-center gap-2 text-xs">
				<AgentAvatar agent={item.author} size="sm" />
				<span className="font-semibold">{crew[item.author].name}</span>
				<span className="text-muted-foreground">
					{kindLabels[item.kind]} · {dayLabel(item.at)} {timeLabel(item.at)}
				</span>
			</div>
			<h2 className="font-semibold">{item.title}</h2>
			{expanded ? (
				<div className="text-sm">
					<CrewText text={item.body} />
				</div>
			) : (
				<Button size="sm" variant="soft" onClick={() => setExpanded(true)}>
					Read the brief
				</Button>
			)}
			{item.actions.length > 0 && (
				<Textarea
					value={note}
					onChange={(event) => setNote(event.target.value)}
					placeholder="Add a reason or a correction (optional). It becomes part of how the bridge learns you."
					rows={2}
					data-testid="stack-item-note"
				/>
			)}
			<div className="flex flex-wrap gap-2">
				{(item.actions.length ? item.actions : [done]).map((action, index) => (
					<Button
						key={action.id}
						size="sm"
						variant={index === 0 && action !== done ? 'default' : 'neutral'}
						disabled={answer.isPending}
						data-testid="stack-item-action"
						data-key={action.id}
						onClick={() => respond(action.id)}
					>
						{action.label}
					</Button>
				))}
			</div>
		</li>
	)
}
