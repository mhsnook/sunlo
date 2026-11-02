import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Loader2, Split, Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toastError } from '@/components/ui/sonner'
import {
	currentSketch,
	DEFAULT_REDO_VERSIONS,
	displayName,
	isCrewKey,
	MAX_REDO_VERSIONS,
	stepLabel,
	type CrewMessageType,
	type SketchOriginType,
	type SketchType,
} from '../../../shared/crew'
import { messageElementId, useStepAction } from '~/lib/crew'
import {
	GalleryCard,
	SketchFrame,
	SketchPicture,
	tileButtonClass,
} from './gallery-card'
import { SketchViewer } from './sketch-viewer'

// Scrolls the room to another message, such as the card that answered a
// step, and flashes it.
function showMessage(id: string) {
	const target = document.getElementById(messageElementId(id))
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
			{what} step {stepLabel(origin.step)} of{' '}
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
	const approveAll = () =>
		stepAction.mutate(
			{ messageId: message.id, step: 0, action: { action: 'approve-all' } },
			{ onError: (error) => toastError(error.message) }
		)
	const allApproved = steps.every((step) => step.status === 'approved')
	const screens = steps.map((step) => ({
		id: currentSketch(step).id,
		title: currentSketch(step).idea,
		note: step.action,
	}))
	return (
		<GalleryCard
			message={message}
			kind="sketches"
			grid={false}
			above={message.card?.from && <OriginLine origin={message.card.from} />}
			label={`Flow · ${steps.length} step${steps.length === 1 ? '' : 's'}`}
			primary={
				!allApproved && (
					<Button
						size="sm"
						disabled={stepAction.isPending}
						onClick={approveAll}
						data-testid="flow-approve-all"
					>
						<Check /> Approve every step
					</Button>
				)
			}
			brief={[
				message.card?.title,
				message.body,
				...steps.map(
					(step) =>
						`${step.label}. ${currentSketch(step).idea}${step.action ? ` → ${step.action}` : ''}`
				),
			]}
		>
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
			<SketchViewer
				screens={screens}
				index={viewing}
				onIndex={setViewing}
				noun="Step"
			/>
		</GalleryCard>
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
	const approved = step.status === 'approved'
	const redrawing = !!step.redo && !step.redo.reply
	return (
		<figure
			className={cn(
				'flex shrink-0 flex-col gap-1.5',
				step.frame === 'phone' ? 'w-36' : 'w-64'
			)}
			data-testid="flow-step"
			data-key={index}
			data-status={approved ? 'approved' : redrawing ? 'redrawing' : undefined}
		>
			<SketchFrame
				frame={step.frame}
				viewLabel={`View step ${step.label} full size`}
				onView={open}
				testId="flow-step-open"
			>
				<SketchPicture
					sketchId={current.id}
					alt={`Step ${step.label}: ${current.idea}`}
				/>
				<span
					className={cn(
						'absolute start-1 top-1 flex items-center gap-0.5 rounded-full px-1.5 text-xs font-semibold',
						approved ? 'bg-success-700 text-white' : 'bg-card'
					)}
				>
					{approved && <Check className="size-3" />}
					{step.label}
				</span>
			</SketchFrame>
			<figcaption className="line-clamp-3 text-xs">{current.idea}</figcaption>
			<StepStatus step={step} />
			<div className="mt-auto flex gap-0.5">
				<Button
					size="sm"
					variant="ghost"
					className={cn(tileButtonClass, approved && 'text-success-800')}
					disabled={busy}
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
					className={tileButtonClass}
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
						className={tileButtonClass}
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
	const { redo, expand, versions, subflows } = step
	if (step.status === 'approved') {
		lines.push(
			<span key="approved" className="text-success-800 font-medium">
				<Check className="inline size-3" /> Approved
			</span>
		)
	}
	if (redo && !redo.reply) {
		lines.push(
			<span key="redo" title={redo.note || undefined}>
				<Loader2 className="inline size-3 animate-spin" /> Being drawn again
			</span>
		)
	}
	if (redo?.reply) {
		lines.push(
			<span key="replaced">
				<MessageLink to={redo.reply} testId="flow-step-versions">
					New versions
				</MessageLink>{' '}
				to pick from
			</span>
		)
	}
	if (expand) {
		lines.push(
			<span key="expand" title={expand.note || undefined}>
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
