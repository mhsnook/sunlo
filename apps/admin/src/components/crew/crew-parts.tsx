import Markdown, { defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { isBlockKind, openingLines } from '../../../shared/blocks'
import { Block } from './blocks'
import { GithubCard } from './github-card'
import { PaintingsCard, SvgsCard } from './paintings-card'
import { SketchesCard } from './sketches-card'
import { MermaidBlock } from './mermaid-block'
import { remarkCrew } from './remark-crew'
import { useState, type ReactNode } from 'react'
import { Check, Copy, Users, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageMarker } from '@/components/ui/message'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	displayName,
	documentSlugInHref,
	findDocumentBySlug,
	isCrewKey,
	isRoomKey,
	type CardType,
	type CrewKey,
	type CrewMessageType,
	type RoomKey,
} from '../../../shared/crew'
import { crewIcons, documentsQuery, roomIcons, useAnswerCard } from '~/lib/crew'
import { CREW, documentLinkOptions } from '~/lib/documents'

type AvatarSize = 'sm' | 'md' | 'lg'

export function AgentAvatar({
	agent,
	size = 'md',
	className,
}: {
	agent: CrewKey | 'crew'
	size?: AvatarSize
	className?: string
}) {
	return (
		<IconAvatar
			icon={agent === 'crew' ? Users : crewIcons[agent]}
			size={size}
			className={className}
		/>
	)
}

export function RoomAvatar({
	room,
	size = 'md',
}: {
	room: RoomKey
	size?: AvatarSize
}) {
	return <IconAvatar icon={roomIcons[room]} size={size} />
}

function IconAvatar({
	icon: Icon,
	size,
	className,
}: {
	icon: LucideIcon
	size: AvatarSize
	className?: string
}) {
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

// "<name> is working…" under a timeline, while any of `agents` runs.
export function WorkingMarker({ agents }: { agents: Array<CrewKey> }) {
	if (!agents.length) return null
	return (
		<MessageMarker
			className="mx-auto max-w-3xl px-4 pb-4"
			data-testid="crew-working"
		>
			{agents.map(displayName).join(' and ')}{' '}
			{agents.length === 1 ? 'is' : 'are'} working…
		</MessageMarker>
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

// A link an agent wrote to a document, as `[the Roadmap](doc:roadmap)`. It
// opens the document in its room's details. A slug no document answers to
// stays plain text, so a name the agent got wrong never becomes a dead
// link.
function DocumentLink({
	slug,
	children,
}: {
	slug: string
	children: ReactNode
}) {
	const { data: documents } = useQuery(documentsQuery())
	const { room } = useParams({ strict: false })
	const document = documents && findDocumentBySlug(documents, slug)
	if (!document) return <>{children}</>
	return (
		<Link
			{...documentLinkOptions(room && isRoomKey(room) ? room : CREW, document)}
			className="text-primary-700 underline"
			data-testid="crew-document-link"
			data-key={document.name}
		>
			{children}
		</Link>
	)
}

// Agents write markdown, with GitHub's checklists and tables. @mentions
// render bold, as in the design, a `doc:` link opens a room's document, and
// a fenced block in a component's language (```chart, ```stats, ```table,
// ```mermaid) renders as that component.
export function CrewText({ text }: { text: string }) {
	return (
		<Markdown
			remarkPlugins={[remarkGfm, remarkCrew]}
			// react-markdown drops a link whose scheme it does not know, which
			// would blank every `doc:` link's href before the renderer sees it.
			urlTransform={(url) =>
				documentSlugInHref(url) ? url : defaultUrlTransform(url)
			}
			components={{
				p: ({ children }) => <p className="not-first:mt-2">{children}</p>,
				ul: ({ children, className }) => (
					<ul
						className={cn(
							'list-disc ps-5 not-first:mt-2',
							className === 'contains-task-list' && 'list-none ps-1'
						)}
					>
						{children}
					</ul>
				),
				ol: ({ children }) => (
					<ol className="list-decimal ps-5 not-first:mt-2">{children}</ol>
				),
				input: ({ checked }) => (
					<input
						type="checkbox"
						checked={checked}
						aria-label={checked ? 'Done' : 'Not done'}
						disabled
						className="me-1.5 align-middle"
					/>
				),
				// A document's headings sit under the page's and the panel's own.
				h1: ({ children }) => (
					<h2 className="text-lg font-semibold not-first:mt-4">{children}</h2>
				),
				h2: ({ children }) => (
					<h3 className="text-base font-semibold not-first:mt-4">{children}</h3>
				),
				h3: ({ children }) => (
					<h4 className="font-semibold not-first:mt-3">{children}</h4>
				),
				table: ({ children }) => (
					<div className="my-2 overflow-x-auto rounded border">
						<table className="w-full text-sm">{children}</table>
					</div>
				),
				th: ({ children }) => (
					<th className="bg-muted px-3 py-1.5 text-start font-medium">
						{children}
					</th>
				),
				td: ({ children }) => (
					<td className="border-t px-3 py-1.5">{children}</td>
				),
				a: ({ children, href }) => {
					const slug = href ? documentSlugInHref(href) : null
					return slug ? (
						<DocumentLink slug={slug}>{children}</DocumentLink>
					) : (
						<a
							href={href}
							className="underline"
							target="_blank"
							rel="noreferrer"
						>
							{children}
						</a>
					)
				},
				pre: ({ children }) => (
					<pre className="bg-muted my-2 overflow-x-auto rounded p-2 text-xs">
						{children}
					</pre>
				),
				// remarkCrew turns component blocks into figures.
				figure: ({ node }) => {
					const kind = String(node?.properties.dataBlock)
					const source = String(node?.properties.dataSource)
					if (kind === 'mermaid') return <MermaidBlock source={source} />
					return isBlockKind(kind) ? (
						<Block kind={kind} source={source} />
					) : null
				},
			}}
		>
			{text}
		</Markdown>
	)
}

// `primary` replaces the card's own action buttons, for a card that answers
// some other way; Dismiss stays.
export function CardActions({
	message,
	primary,
}: {
	message: CrewMessageType
	primary?: ReactNode
}) {
	const answer = useAnswerCard()
	// Null until the admin starts dismissing; then the feedback they type.
	const [feedback, setFeedback] = useState<string | null>(null)
	if (!message.card) return null
	if (message.answer) {
		return (
			<p className="text-muted-foreground px-1 text-xs">
				{message.answer.actionId === 'dismiss' ? (
					`${message.answer.by} dismissed this`
				) : message.answer.url ? (
					<>
						{message.answer.by}:{' '}
						<a
							href={message.answer.url}
							target="_blank"
							rel="noreferrer"
							className="text-primary-700 underline"
							data-testid="crew-card-filed"
						>
							{message.answer.label}
						</a>
					</>
				) : (
					`${message.answer.by} chose “${message.answer.label}”`
				)}
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
			{primary ??
				message.card.actions.map((action, index) => (
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
	question: 'A question for you',
	decide: 'Your call · on hold',
	confirm: 'Done in your stead · confirm',
	escalate: 'Needs more than the crew has',
	charter: 'For the charter',
	know: 'Worth knowing',
	brief: 'Weekly brief',
	report: 'Pre-meeting report',
	github: 'For GitHub',
}

const folds: Partial<Record<CardType['kind'], string>> = {
	brief: `${displayName('command-1')} posts the weekly brief`,
	report: `${displayName('command-2')} submits the pre-meeting report`,
}

// A card an agent brings the admin in its room. A brief or a report arrives
// folded, like a link preview: its title and opening lines, and the whole of
// it a click away.
export function RoomCard({ message }: { message: CrewMessageType }) {
	const [unfolded, setUnfolded] = useState(false)
	const card = message.card
	if (!card) return null
	if (card.kind === 'github' && card.draft) {
		return <GithubCard message={message} draft={card.draft} />
	}
	if (card.kind === 'sketches' && card.sketches) {
		return <SketchesCard message={message} sketches={card.sketches} />
	}
	if (card.kind === 'paintings' && card.paintings) {
		return <PaintingsCard message={message} paintings={card.paintings} />
	}
	if (card.kind === 'svgs' && card.svgs) {
		return <SvgsCard message={message} svgs={card.svgs} />
	}
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
						{openingLines(message.body, 220)}
					</span>
					<span className="text-primary-700 block text-xs font-medium">
						Open the {card.kind}
					</span>
				</Button>
			</div>
		)
	}
	return (
		<CardFrame
			kind={card.kind}
			label={cardLabels[card.kind]}
			brief={[card.title, message.body, message.answer?.url]}
		>
			{card.title && <p className="text-sm font-semibold">{card.title}</p>}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<CardActions message={message} />
		</CardFrame>
	)
}

// Every unfolded card's frame: its label, and the Copy brief button, which
// copies the parts of `brief` it has.
export function CardFrame({
	kind,
	label,
	brief,
	children,
}: {
	kind: CardType['kind']
	label: string | undefined
	brief: Array<string | null | undefined>
	children: ReactNode
}) {
	return (
		<div
			className="bg-card w-full max-w-xl space-y-2 rounded-2xl border p-3"
			data-testid="room-card"
			data-key={kind}
		>
			<div className="flex items-center gap-2">
				<p className="text-muted-foreground me-auto text-xs font-medium">
					{label}
				</p>
				<CopyBrief text={brief.filter(Boolean).join('\n\n')} />
			</div>
			{children}
		</div>
	)
}

// Copies a card's text, for pasting into a Claude Code session.
function CopyBrief({ text }: { text: string }) {
	const [copied, setCopied] = useState(false)
	return (
		<Button
			variant="ghost"
			size="sm"
			className="text-muted-foreground h-7 px-2 shadow-none"
			data-testid="crew-card-copy"
			onClick={() =>
				void navigator.clipboard.writeText(text).then(
					() => {
						setCopied(true)
						toastSuccess('Brief copied')
					},
					(error: Error) => toastError(error.message)
				)
			}
		>
			{copied ? <Check /> : <Copy />} Copy brief
		</Button>
	)
}
