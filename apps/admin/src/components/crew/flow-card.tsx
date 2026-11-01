import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	ArrowRight,
	Check,
	ImageIcon,
	Loader2,
	Split,
	Undo2,
	X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import {
	currentSketch,
	displayName,
	isCrewKey,
	MAX_REDO_VERSIONS,
	type CrewMessageType,
	type SketchOriginType,
	type SketchType,
} from '../../../shared/crew'
import { sketchImageQuery, useStepAction } from '~/lib/crew'
import { CardActions, CardFrame, CrewText } from './crew-parts'
import { SketchViewer } from './sketch-viewer'

const DEFAULT_REDO_VERSIONS = 2

// Scrolls the room to another message, such as the card that answered a
// step, and flashes it.
export function showMessage(id: string) {
	const target = document.querySelector<HTMLElement>(
		`[data-testid="crew-message"][data-key="${CSS.escape(id)}"]`
	)
	if (!target) {
		toastError('That card is further back in the room than this page goes')
		return
	}
	target.scrollIntoView({ behavior: 'smooth', block: 'center' })
	target.animate(
		[{ backgroundColor: 'var(--color-primary-100)' }, { backgroundColor: '' }],
		{ duration: 1600 }
	)
}

export function MessageLink({
	to,
	testId,
	children,
}: {
	to: string
	testId: string
	children: ReactNode
}) {
	return (
		<button
			type="button"
			className="text-primary-700 hover:text-primary-800 underline underline-offset-2"
			onClick={() => showMessage(to)}
			data-testid={testId}
			data-key={to}
		>
			{children}
		</button>
	)
}

// The line on a card that answers one step of a flow, linking back to it.
export function OriginLine({ origin }: { origin: SketchOriginType }) {
	const what = origin.kind === 'redo' ? 'New versions of' : 'A sub-flow of'
	return (
		<p className="text-muted-foreground text-xs" data-testid="sketch-origin">
			{what} step {origin.label} of{' '}
			<MessageLink to={origin.messageId} testId="sketch-origin-link">
				“{origin.title}”
			</MessageLink>
		</p>
	)
}

type Form = { step: number; kind: 'redo' | 'expand' }

// product-2's screens in the order someone passes through them. Each step
// can be approved, drawn again or expanded into a sub-flow, and the card
// shows where each of those stands.
export function FlowCard({
	message,
	steps,
}: {
	message: CrewMessageType
	steps: Array<SketchType>
}) {
	const [viewing, setViewing] = useState<number | null>(null)
	const [form, setForm] = useState<Form | null>(null)
	const stepAction = useStepAction()
	const author = isCrewKey(message.author)
		? displayName(message.author)
		: 'The agent'
	const approve = (step: number, approved: boolean) =>
		stepAction.mutate(
			{
				messageId: message.id,
				step,
				action: { action: approved ? 'approve' : 'unapprove' },
			},
			{ onError: (error) => toastError(error.message) }
		)
	const screens = steps.map((step) => ({
		id: currentSketch(step).id,
		title: currentSketch(step).idea,
		note: step.action,
	}))
	return (
		<CardFrame
			kind="sketches"
			label={`Flow · ${steps.length} step${steps.length === 1 ? '' : 's'}`}
			brief={[
				message.card?.title,
				message.body,
				...steps.map(
					(step) =>
						`${step.label}. ${currentSketch(step).idea}${step.action ? ` → ${step.action}` : ''}`
				),
			]}
		>
			{message.card?.from && <OriginLine origin={message.card.from} />}
			{message.card?.title && (
				<p className="text-sm font-semibold">{message.card.title}</p>
			)}
			<div className="text-sm">
				<CrewText text={message.body} />
			</div>
			<ol
				className="-mx-3 flex snap-x items-stretch gap-1 overflow-x-auto px-3 pb-2"
				data-testid="flow-steps"
			>
				{steps.map((step, index) => (
					<li key={step.id} className="flex snap-start items-stretch gap-1">
						<FlowStep
							step={step}
							index={index}
							busy={stepAction.isPending}
							open={() => setViewing(index)}
							onApprove={(approved) => approve(index, approved)}
							onForm={(kind) => setForm({ step: index, kind })}
						/>
						{index < steps.length - 1 && <StepArrow action={step.action} />}
					</li>
				))}
			</ol>
			{form && (
				<StepForm
					key={`${form.kind}-${form.step}`}
					form={form}
					label={steps[form.step].label}
					author={author}
					busy={stepAction.isPending}
					onCancel={() => setForm(null)}
					onSend={(note, count) =>
						stepAction.mutate(
							{
								messageId: message.id,
								step: form.step,
								action:
									form.kind === 'redo'
										? { action: 'redo', note, count }
										: { action: 'expand', note },
							},
							{
								onSuccess: () => setForm(null),
								onError: (error) => toastError(error.message),
							}
						)
					}
				/>
			)}
			<CardActions message={message} />
			<SketchViewer
				screens={screens}
				index={viewing}
				onIndex={setViewing}
				noun="Step"
			/>
		</CardFrame>
	)
}

function StepArrow({ action }: { action: string | undefined }) {
	return (
		<div className="text-muted-foreground flex w-16 shrink-0 flex-col items-center justify-center gap-1 pb-16 text-center text-xs">
			<ArrowRight className="size-4 rtl:rotate-180" />
			{action && <span className="line-clamp-3">{action}</span>}
		</div>
	)
}

function FlowStep({
	step,
	index,
	busy,
	open,
	onApprove,
	onForm,
}: {
	step: SketchType
	index: number
	busy: boolean
	open: () => void
	onApprove: (approved: boolean) => void
	onForm: (kind: Form['kind']) => void
}) {
	const current = currentSketch(step)
	const { data: image, isError } = useQuery(sketchImageQuery(current.id))
	const approved = step.status === 'approved'
	const redrawing = step.request?.kind === 'redo'
	return (
		<figure
			className={cn(
				'flex shrink-0 flex-col gap-1.5',
				step.frame === 'phone' ? 'w-36' : 'w-64'
			)}
			data-testid="flow-step"
			data-key={index}
			data-status={
				approved ? 'approved' : redrawing ? 'redrawing' : step.status
			}
		>
			<button
				type="button"
				onClick={open}
				className={cn(
					'bg-muted relative flex items-center justify-center overflow-hidden rounded border',
					step.frame === 'phone' ? 'aspect-390/844' : 'aspect-8/5'
				)}
				aria-label={`Open step ${step.label} full size`}
				data-testid="flow-step-open"
			>
				{image ? (
					<img
						src={image.url}
						alt={`Step ${step.label}: ${current.idea}`}
						className={cn(
							'h-full w-full object-cover object-top',
							redrawing && 'opacity-40'
						)}
					/>
				) : (
					<ImageIcon
						className={cn(
							'text-muted-foreground size-6',
							!isError && 'animate-pulse'
						)}
					/>
				)}
				<span
					className={cn(
						'absolute start-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold',
						approved ? 'bg-success-700 text-white' : 'bg-card'
					)}
				>
					{approved && <Check className="size-3" />}
					{step.label}
				</span>
			</button>
			<figcaption className="line-clamp-3 text-xs">{current.idea}</figcaption>
			<StepStatus step={step} />
			<div className="mt-auto flex gap-0.5">
				<Button
					size="sm"
					variant="ghost"
					className={cn(
						'h-7 px-1.5 shadow-none',
						approved && 'text-success-800'
					)}
					disabled={busy || redrawing}
					onClick={() => onApprove(!approved)}
					aria-label={
						approved
							? `Take back the approval of step ${step.label}`
							: `Approve step ${step.label}`
					}
					title={approved ? 'Take back the approval' : 'Approve this step'}
					data-testid="flow-step-approve"
				>
					{approved ? <Undo2 /> : <Check />}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-1.5 shadow-none"
					disabled={busy}
					onClick={() => onForm('redo')}
					aria-label={`Draw step ${step.label} again`}
					title="Draw this step again"
					data-testid="flow-step-redo"
				>
					<X />
				</Button>
				{approved && (
					<Button
						size="sm"
						variant="ghost"
						className="h-7 px-1.5 shadow-none"
						disabled={busy}
						onClick={() => onForm('expand')}
						aria-label={`Expand step ${step.label} into a sub-flow`}
						title="Expand into a sub-flow"
						data-testid="flow-step-expand"
					>
						<Split className="rotate-90" />
					</Button>
				)}
			</div>
		</figure>
	)
}

// Where a step stands: approved, being drawn again, waiting on a pick
// among new versions, redrawn, or expanded.
function StepStatus({ step }: { step: SketchType }) {
	const lines: Array<ReactNode> = []
	const { request, versions, subflows } = step
	if (step.status === 'approved') {
		lines.push(
			<span key="approved" className="text-success-800 font-medium">
				<Check className="inline size-3" /> Approved
			</span>
		)
	}
	if (request?.kind === 'redo' && !request.reply) {
		lines.push(
			<span key="redo" title={request.note || undefined}>
				<Loader2 className="inline size-3 animate-spin" /> Being drawn again
			</span>
		)
	}
	if (request?.kind === 'redo' && request.reply) {
		lines.push(
			<span key="replaced">
				Superseded:{' '}
				<MessageLink to={request.reply} testId="flow-step-versions">
					new versions
				</MessageLink>
			</span>
		)
	}
	if (request?.kind === 'expand') {
		lines.push(
			<span key="expand" title={request.note || undefined}>
				<Loader2 className="inline size-3 animate-spin" /> Sub-flow coming
			</span>
		)
	}
	const latest = versions?.at(-1)
	if (versions && latest) {
		lines.push(
			<span key="version">
				<MessageLink to={latest.messageId} testId="flow-step-redrawn">
					Version {versions.length + 1}
				</MessageLink>
			</span>
		)
	}
	subflows?.forEach((flow, index) =>
		lines.push(
			<span key={flow}>
				<MessageLink to={flow} testId="flow-step-subflow">
					Sub-flow{subflows.length > 1 ? ` ${index + 1}` : ''}
				</MessageLink>
			</span>
		)
	)
	if (!lines.length) return null
	return (
		<div
			className="text-muted-foreground flex flex-col gap-0.5 text-xs"
			data-testid="flow-step-status"
		>
			{lines}
		</div>
	)
}

function StepForm({
	form,
	label,
	author,
	busy,
	onCancel,
	onSend,
}: {
	form: Form
	label: string
	author: string
	busy: boolean
	onCancel: () => void
	onSend: (note: string, count: number) => void
}) {
	const [note, setNote] = useState('')
	const [count, setCount] = useState(DEFAULT_REDO_VERSIONS)
	const redo = form.kind === 'redo'
	return (
		<form
			className="space-y-2 border-t pt-2"
			data-testid="flow-step-form"
			data-key={form.kind}
			onSubmit={(event) => {
				event.preventDefault()
				onSend(note.trim(), count)
			}}
		>
			<p className="text-xs font-medium">
				{redo
					? `Draw step ${label} again`
					: `Expand step ${label} into a sub-flow`}
			</p>
			<Textarea
				value={note}
				onChange={(event) => setNote(event.target.value)}
				placeholder={
					redo
						? `What don't you like about it? ${author} reads this.`
						: `What should the sub-flow work through? ${author} reads this.`
				}
				rows={2}
				aria-label={redo ? 'What to change' : 'What to work through'}
				data-testid="flow-step-note"
				ref={(field) => field?.focus()}
			/>
			<div className="flex flex-wrap items-center gap-1">
				{redo && (
					<fieldset className="me-2 flex items-center gap-1 text-xs">
						<legend className="sr-only">How many versions</legend>
						<span className="text-muted-foreground me-1" aria-hidden>
							Versions
						</span>
						{Array.from({ length: MAX_REDO_VERSIONS }, (_, i) => i + 1).map(
							(n) => (
								<Button
									key={n}
									type="button"
									size="sm"
									variant={n === count ? 'default' : 'ghost'}
									className="h-7 w-7 px-0 shadow-none"
									aria-pressed={n === count}
									onClick={() => setCount(n)}
									data-testid="flow-step-count"
									data-key={n}
								>
									{n}
								</Button>
							)
						)}
					</fieldset>
				)}
				<Button
					type="submit"
					size="sm"
					disabled={busy}
					data-testid="flow-step-send"
				>
					{redo ? 'Draw again' : 'Expand'}
				</Button>
				<Button type="button" size="sm" variant="ghost" onClick={onCancel}>
					<X /> Cancel
				</Button>
			</div>
		</form>
	)
}
