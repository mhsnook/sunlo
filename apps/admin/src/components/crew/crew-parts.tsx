import Markdown from 'react-markdown'
import { isBlockKind } from '../../../shared/blocks'
import { Block } from './blocks'
import { remarkCrew } from './remark-crew'
import { useState } from 'react'
import { Rocket, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import type { CardType, CrewKey, CrewMessageType } from '../../../shared/crew'
import { crewIcons, useAnswerCard } from '~/lib/crew'

export function AgentAvatar({
	agent,
	size = 'md',
	className,
}: {
	agent: CrewKey | 'crew' | 'enterprise'
	size?: 'sm' | 'md' | 'lg'
	className?: string
}) {
	const Icon =
		agent === 'crew'
			? Users
			: agent === 'enterprise'
				? Rocket
				: crewIcons[agent]
	return (
		<span
			aria-hidden
			className={cn(
				'bg-primary-100 text-primary-700 grid shrink-0 place-items-center rounded-xl',
				size === 'sm' && 'size-7 [&_svg]:size-4',
				size === 'md' && 'size-9 [&_svg]:size-5',
				size === 'lg' && 'size-14 rounded-2xl [&_svg]:size-8',
				className
			)}
		>
			<Icon />
		</span>
	)
}

export function AdminAvatar({ name }: { name: string }) {
	return (
		<span
			aria-hidden
			className="bg-primary-100 text-primary-700 grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold"
		>
			{name.slice(0, 1).toUpperCase()}
		</span>
	)
}

// Agents write markdown. @mentions render bold, as in the design, and a
// fenced block in a component's language (```chart, ```stats, ```table)
// renders as that component.
export function CrewText({ text }: { text: string }) {
	return (
		<Markdown
			remarkPlugins={[remarkCrew]}
			components={{
				p: ({ children }) => <p className="not-first:mt-2">{children}</p>,
				ul: ({ children }) => (
					<ul className="list-disc ps-5 not-first:mt-2">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="list-decimal ps-5 not-first:mt-2">{children}</ol>
				),
				h3: ({ children }) => (
					<h3 className="font-semibold not-first:mt-3">{children}</h3>
				),
				a: ({ children, href }) => (
					<a href={href} className="underline" target="_blank" rel="noreferrer">
						{children}
					</a>
				),
				pre: ({ children }) => (
					<pre className="bg-muted my-2 overflow-x-auto rounded p-2 text-xs">
						{children}
					</pre>
				),
				// remarkCrew turns component blocks into figures.
				figure: ({ node }) => {
					const kind = String(node?.properties.dataBlock)
					return isBlockKind(kind) ? (
						<Block kind={kind} source={String(node?.properties.dataSource)} />
					) : null
				},
			}}
		>
			{text}
		</Markdown>
	)
}

export function CardActions({ message }: { message: CrewMessageType }) {
	const answer = useAnswerCard()
	if (!message.card) return null
	if (message.answer) {
		return (
			<p className="text-muted-foreground px-1 text-xs">
				{message.answer.by} chose “{message.answer.label}”
			</p>
		)
	}
	return (
		<div className="flex flex-wrap gap-1">
			{message.card.actions.map((action, index) => (
				<Button
					key={action.id}
					size="sm"
					variant={index === 0 ? 'default' : 'ghost'}
					disabled={answer.isPending}
					data-testid="crew-card-action"
					data-key={action.id}
					onClick={() =>
						answer.mutate(
							{ messageId: message.id, actionId: action.id },
							{ onError: (error) => toastError(error.message) }
						)
					}
				>
					{action.label}
				</Button>
			))}
		</div>
	)
}

// A proposed change to an agent's plan.
export function ChangeCard({ message }: { message: CrewMessageType }) {
	return (
		<div className="bg-card w-full max-w-sm space-y-2 rounded-2xl border p-3">
			<p className="text-muted-foreground text-xs font-medium">
				Change to the plan
			</p>
			<p className="text-sm font-semibold">{message.card?.title}</p>
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<CardActions message={message} />
		</div>
	)
}

const bridgeLabels: Partial<Record<CardType['kind'], string>> = {
	decide: 'Your call · on hold',
	confirm: 'Done in your stead · confirm',
	escalate: 'Needs more than the crew has',
	charter: 'For the charter',
	know: 'Worth knowing',
	brief: 'Weekly brief',
}

// A card Riker or Data brings the admin in the Enterprise thread. A brief
// starts folded.
export function BridgeCard({ message }: { message: CrewMessageType }) {
	const [unfolded, setUnfolded] = useState(false)
	const card = message.card
	if (!card) return null
	const folded = card.kind === 'brief' && !unfolded
	return (
		<div
			className="bg-card w-full max-w-xl space-y-2 rounded-2xl border p-3"
			data-testid="bridge-card"
			data-key={card.kind}
		>
			<p className="text-muted-foreground text-xs font-medium">
				{bridgeLabels[card.kind]}
			</p>
			{card.title && <p className="text-sm font-semibold">{card.title}</p>}
			{folded ? (
				<Button size="sm" variant="soft" onClick={() => setUnfolded(true)}>
					Read the brief
				</Button>
			) : (
				<div className="text-sm">
					<CrewText text={message.body} />
				</div>
			)}
			<CardActions message={message} />
		</div>
	)
}
