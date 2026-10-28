import Markdown from 'react-markdown'
import { isBlockKind } from '../../../shared/blocks'
import { Block } from './blocks'
import { remarkCrew } from './remark-crew'
import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import {
	displayName,
	isCrewKey,
	type CardType,
	type CrewKey,
	type CrewMessageType,
} from '../../../shared/crew'
import { crewIcons, useAnswerCard } from '~/lib/crew'

export function AgentAvatar({
	agent,
	size = 'md',
	className,
}: {
	agent: CrewKey | 'crew'
	size?: 'sm' | 'md' | 'lg'
	className?: string
}) {
	const Icon = agent === 'crew' ? Users : crewIcons[agent]
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
	// Null until the admin starts dismissing; then the feedback they type.
	const [feedback, setFeedback] = useState<string | null>(null)
	if (!message.card) return null
	if (message.answer) {
		return (
			<p className="text-muted-foreground px-1 text-xs">
				{message.answer.actionId === 'dismiss'
					? `${message.answer.by} dismissed this`
					: `${message.answer.by} chose “${message.answer.label}”`}
			</p>
		)
	}
	const send = (actionId: string, text?: string) =>
		answer.mutate(
			{ messageId: message.id, actionId, feedback: text },
			{ onError: (error) => toastError(error.message) }
		)
	const author = isCrewKey(message.author) ? displayName(message.author) : null
	if (feedback !== null) {
		return (
			<form
				className="space-y-2"
				onSubmit={(event) => {
					event.preventDefault()
					send('dismiss', feedback.trim() || undefined)
				}}
			>
				<Textarea
					value={feedback}
					onChange={(event) => setFeedback(event.target.value)}
					placeholder={`Why not? ${author ?? 'The agent'} learns from this. Optional.`}
					rows={2}
					aria-label="Feedback"
					data-testid="crew-card-feedback"
					ref={(field) => field?.focus()}
				/>
				<div className="flex gap-1">
					<Button
						type="submit"
						size="sm"
						disabled={answer.isPending}
						data-testid="crew-card-dismiss-send"
					>
						Dismiss
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => setFeedback(null)}
					>
						Cancel
					</Button>
				</div>
			</form>
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
					onClick={() => send(action.id)}
				>
					{action.label}
				</Button>
			))}
			<Button
				size="sm"
				variant="ghost"
				className="text-muted-foreground ms-auto"
				disabled={answer.isPending}
				data-testid="crew-card-dismiss"
				onClick={() => setFeedback('')}
			>
				<X /> Dismiss
			</Button>
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

const cardLabels: Partial<Record<CardType['kind'], string>> = {
	decide: 'Your call · on hold',
	confirm: 'Done in your stead · confirm',
	escalate: 'Needs more than the crew has',
	charter: 'For the charter',
	know: 'Worth knowing',
	brief: 'Weekly brief',
	report: 'Pre-meeting report',
}

const folds: Partial<Record<CardType['kind'], string>> = {
	brief: 'Riker posts the weekly brief',
	report: 'Data submits the pre-meeting report',
}

// The opening prose of a markdown body, for a folded card's preview.
function openingLines(body: string) {
	const paragraph =
		body
			.split(/\n\s*\n/)
			.map((part) => part.trim())
			.find((part) => part && !/^(#|```|~~~|\|)/.test(part)) ?? ''
	const text = paragraph
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[*_`>#]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
	return text.length > 220 ? `${text.slice(0, 219)}…` : text
}

// A card an agent brings the admin in its room. A brief or a report arrives
// folded, like a link preview: its title and opening lines, and the whole of
// it a click away.
export function RoomCard({ message }: { message: CrewMessageType }) {
	const [unfolded, setUnfolded] = useState(false)
	const card = message.card
	if (!card) return null
	const fold = folds[card.kind]
	if (fold && !unfolded) {
		return (
			<div className="w-full max-w-xl space-y-1">
				<p className="text-muted-foreground text-sm italic">{fold}</p>
				<Button
					variant="neutral"
					className="bg-card hover:bg-primary-50 border-border h-auto w-full flex-col items-start gap-1 rounded-2xl p-3 text-start whitespace-normal shadow-none"
					data-testid="room-card"
					data-key={card.kind}
					aria-expanded={false}
					onClick={() => setUnfolded(true)}
				>
					{card.title && (
						<span className="block text-sm font-semibold">{card.title}</span>
					)}
					<span className="text-muted-foreground line-clamp-3 block text-sm">
						{openingLines(message.body)}
					</span>
					<span className="text-primary-700 block text-xs font-medium">
						Open the {card.kind}
					</span>
				</Button>
			</div>
		)
	}
	return (
		<div
			className="bg-card w-full max-w-xl space-y-2 rounded-2xl border p-3"
			data-testid="room-card"
			data-key={card.kind}
		>
			<p className="text-muted-foreground text-xs font-medium">
				{cardLabels[card.kind]}
			</p>
			{card.title && <p className="text-sm font-semibold">{card.title}</p>}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<CardActions message={message} />
		</div>
	)
}
