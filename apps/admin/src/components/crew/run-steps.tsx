import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
	BrainIcon,
	CircleAlertIcon,
	CircleCheckIcon,
	LoaderCircleIcon,
} from 'lucide-react'
import {
	Trace,
	TraceCollapsible,
	TraceCollapsibleContent,
	TraceCollapsibleTrigger,
	TraceDescription,
	TraceIcon,
	TraceLine,
	TraceTitle,
} from '~/components/ai-elements/trace'
import {
	displayName,
	type CrewKey,
	type CrewMessageType,
	type RunStepType,
	type RunType,
} from '../../../shared/crew'
import { runsQuery } from '~/lib/crew'
import { placeRuns, type RunParts } from '~/lib/run-parts'

type Status = 'running' | 'error' | undefined

const stepCount = (count: number) => (count === 1 ? '1 step' : `${count} steps`)

const seconds = (ms: number | null) =>
	ms !== null && ms >= 1000 ? `${Math.round(ms / 1000)}s` : null

function StatusIcon({ status }: { status: Status }) {
	if (status === 'running') return <LoaderCircleIcon className="animate-spin" />
	return status === 'error' ? <CircleAlertIcon /> : <CircleCheckIcon />
}

// A step still running when its run has ended never finished: a tool call
// reads as failed, as in the Chain of Thought, and thinking as done.
const stateOf = (step: RunStepType, run: RunType): RunStepType['state'] =>
	step.state === 'running' && run.outcome !== 'working'
		? step.kind === 'tool'
			? 'failed'
			: 'done'
		: step.state

// One step, as the Chain of Thought's steps read: a tool call in the tense of
// its state, or the model's thinking, as Reasoning shows it. A step with
// input or thinking to read folds it under its line.
function StepLine({
	step,
	state,
}: {
	step: RunStepType
	state: RunStepType['state']
}) {
	const status: Status =
		state === 'running' ? 'running' : state === 'failed' ? 'error' : undefined
	const time = seconds(step.ms)
	const line = (keyed: boolean) => (
		<TraceLine
			status={status}
			data-testid={keyed ? 'run-step' : undefined}
			data-key={keyed ? step.id : undefined}
		>
			<TraceIcon>
				{step.kind === 'thinking' && status !== 'running' ? (
					<BrainIcon />
				) : (
					<StatusIcon status={status} />
				)}
			</TraceIcon>
			<TraceTitle>{step.title[state]}</TraceTitle>
			{time && (
				<TraceDescription>
					{step.kind === 'thinking' ? `for ${time}` : time}
				</TraceDescription>
			)}
		</TraceLine>
	)
	if (!step.detail && !step.error) {
		return line(true)
	}
	return (
		<TraceCollapsible data-testid="run-step" data-key={step.id}>
			<TraceCollapsibleTrigger>{line(false)}</TraceCollapsibleTrigger>
			<TraceCollapsibleContent className="space-y-1 text-xs whitespace-pre-wrap">
				{step.error && <p className="text-destructive">{step.error}</p>}
				{step.detail && <p>{step.detail}</p>}
			</TraceCollapsibleContent>
		</TraceCollapsible>
	)
}

// A run's steps under one summary line, as AI Elements' Chain of Thought
// draws them: open while the run works, folded once it ends. `who` names
// the agent when the line sits under someone else's message.
export function RunTrace({
	run,
	who,
	place,
}: {
	run: RunType
	who: string | null
	place: 'above' | 'under' | 'live'
}) {
	const [open, setOpen] = useState<boolean>()
	const running = run.outcome === 'working'
	const count = run.steps.length + run.dropped
	const failed = run.steps.filter(
		(step) => stateOf(step, run) === 'failed'
	).length
	const status: Status = running
		? 'running'
		: run.outcome === 'failed' || failed > 0
			? 'error'
			: undefined
	const summary = running
		? `${stepCount(count)} so far`
		: run.outcome === 'failed'
			? count
				? `stopped after ${stepCount(count)}`
				: 'stopped before its first step'
			: `worked in ${stepCount(count)}${failed ? `, ${failed} failed` : ''}`
	const title = who
		? `${who}${running ? ', ' : ' '}${summary}`
		: summary.charAt(0).toUpperCase() + summary.slice(1)
	return (
		<Trace
			data-testid="run-steps"
			data-key={run.id}
			data-place={place}
			data-outcome={run.outcome}
		>
			<TraceCollapsible open={open ?? running} onOpenChange={setOpen}>
				<TraceCollapsibleTrigger data-testid="run-steps-toggle">
					<TraceLine status={status}>
						<TraceIcon>
							<StatusIcon status={status} />
						</TraceIcon>
						<TraceTitle>{title}</TraceTitle>
					</TraceLine>
				</TraceCollapsibleTrigger>
				<TraceCollapsibleContent>
					<Trace>
						{run.error && (
							<p
								className="text-destructive text-xs break-words"
								data-testid="run-error"
							>
								{run.error}
							</p>
						)}
						{run.dropped > 0 && (
							<TraceLine status="pending">
								<TraceTitle>
									{stepCount(run.dropped)} before these are not kept
								</TraceTitle>
							</TraceLine>
						)}
						{run.steps.map((step) => (
							<StepLine key={step.id} step={step} state={stateOf(step, run)} />
						))}
					</Trace>
				</TraceCollapsibleContent>
			</TraceCollapsible>
		</Trace>
	)
}

// `agents` limits only the live list. It is who belongs in the room, not who
// the room counts as working: an agent's side-thread run can end, and set it
// idle, while its main run goes on.
export function useRunParts(
	messages: Array<CrewMessageType>,
	agents: ReadonlyArray<CrewKey>
): RunParts {
	const { data: runs = [] } = useQuery(runsQuery())
	return placeRuns(runs, messages, agents)
}

export function MessageRunParts({
	parts,
	message,
	place,
}: {
	parts: Array<RunType> | undefined
	message: CrewMessageType
	place: 'above' | 'under'
}) {
	if (!parts?.length) return null
	return (
		<div className="w-full min-w-0 space-y-1 px-1">
			{parts.map((part) => (
				<RunTrace
					key={part.id}
					run={part}
					place={place}
					who={part.agent === message.author ? null : displayName(part.agent)}
				/>
			))}
		</div>
	)
}

export function LiveRuns({ runs }: { runs: Array<RunType> }) {
	if (!runs.length) return null
	return (
		<div
			className="mx-auto w-full max-w-3xl space-y-3 px-4 pb-4"
			data-testid="crew-live-runs"
		>
			{runs.map((run) => (
				<RunTrace
					key={run.id}
					run={run}
					place="live"
					who={`${displayName(run.agent)}${run.thread ? ' in a side-thread' : ''}`}
				/>
			))}
		</div>
	)
}

export function MessageRuns({ message }: { message: CrewMessageType }) {
	const { data: runs = [] } = useQuery({
		...runsQuery(),
		select: (all) =>
			all.filter(
				(run) =>
					run.messageId === message.id &&
					run.outcome !== 'working' &&
					(run.steps.length + run.dropped > 0 || run.error !== null)
			),
	})
	if (!runs.length) return null
	return (
		<div className="w-full min-w-0 space-y-1 px-1">
			{runs.map((run) => (
				<RunTrace
					key={run.id}
					run={run}
					place="under"
					who={run.agent === message.author ? null : displayName(run.agent)}
				/>
			))}
		</div>
	)
}
