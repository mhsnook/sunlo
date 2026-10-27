import Markdown from 'react-markdown'
import { isBlockKind } from '../../../shared/blocks'
import { Block } from './blocks'
import { Inbox, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { toastError } from '@/components/ui/sonner'
import type { CrewKey, CrewMessageType } from '../../../shared/crew'
import { crewIcons, useAnswerCard } from '~/lib/crew'

export function AgentAvatar({
	agent,
	size = 'md',
	className,
}: {
	agent: CrewKey | 'crew' | 'stack'
	size?: 'sm' | 'md' | 'lg'
	className?: string
}) {
	const Icon =
		agent === 'crew' ? Users : agent === 'stack' ? Inbox : crewIcons[agent]
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
				pre: ({ node, children }) => {
					const code = node?.children[0]
					const language =
						code?.type === 'element'
							? String(
									(
										code.properties.className as Array<string> | undefined
									)?.[0] ?? ''
								).replace(/^language-/, '')
							: ''
					const source =
						code?.type === 'element' && code.children[0]?.type === 'text'
							? code.children[0].value
							: ''
					if (isBlockKind(language)) {
						return <Block kind={language} source={source} />
					}
					return (
						<pre className="bg-muted my-2 overflow-x-auto rounded p-2 text-xs">
							{children}
						</pre>
					)
				},
			}}
		>
			{boldMentions(text)}
		</Markdown>
	)
}

// Outside code fences only, so JSON in a component block stays intact.
const boldMentions = (text: string) =>
	text
		.split(/(```[\s\S]*?```)/g)
		.map((part, index) =>
			index % 2 === 1
				? part
				: part.replace(/(^|\s)@([A-Za-z][\w-]*)/g, '$1**@$2**')
		)
		.join('')

const timeFormat = new Intl.DateTimeFormat(undefined, {
	hour: '2-digit',
	minute: '2-digit',
})
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' })
const dateFormat = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
})

const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

// "Today", "Yesterday", a weekday within the last week, then a date.
export function dayLabel(iso: string) {
	const days = Math.round(
		(startOfDay(new Date()) - startOfDay(new Date(iso))) / 86_400_000
	)
	if (days === 0) return 'Today'
	if (days === 1) return 'Yesterday'
	if (days < 7) return weekdayFormat.format(new Date(iso))
	return dateFormat.format(new Date(iso))
}

export const timeLabel = (iso: string) => timeFormat.format(new Date(iso))

// Today shows the time; earlier days show the day, like a chat list.
export const shortWhen = (iso: string) =>
	dayLabel(iso) === 'Today' ? timeLabel(iso) : dayLabel(iso).slice(0, 3)

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
