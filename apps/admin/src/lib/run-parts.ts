import {
	speakerOf,
	type CrewKey,
	type CrewMessageType,
	type RunStepType,
	type RunType,
} from '../../shared/crew'

// Where a timeline draws each run. A run that speaks in the timeline is cut
// at each of its messages, so its steps and its messages read in the order
// they happened.
export type RunParts = {
	// By message id: the steps that led to the message, drawn above it.
	above: Map<string, Array<RunType>>
	// By message id: the steps that followed the message, drawn under it, or
	// a whole run that said nothing in the timeline, under the message it
	// answers.
	under: Map<string, Array<RunType>>
	// The steps of each working run since its last message in the timeline.
	live: Array<RunType>
}

const time = (at: string) => Date.parse(at)

const working = (run: RunType) => run.outcome === 'working'

const hasContent = (part: RunType) =>
	part.steps.length + part.dropped > 0 || part.error !== null

function push(map: Map<string, Array<RunType>>, id: string, part: RunType) {
	map.set(id, [...(map.get(id) ?? []), part])
}

// The run's messages among `messages`, oldest first. Receipts and second
// views stay out, so they never cut a run.
function postsOf(run: RunType, messages: Array<CrewMessageType>) {
	const start = time(run.startedAt)
	const end = run.endedAt ? time(run.endedAt) : Infinity
	return messages
		.filter(
			(message) =>
				speakerOf(message) === run.agent &&
				!message.otherViewOf &&
				time(message.at) >= start &&
				time(message.at) <= end
		)
		.toSorted((a, b) => time(a.at) - time(b.at))
}

// A part before the run's last one ended with its message, unless a step in
// it still runs in a working run, such as the call that posted the message.
const partOutcome = (
	run: RunType,
	steps: Array<RunStepType>
): RunType['outcome'] =>
	run.outcome === 'working' && steps.some((step) => step.state === 'running')
		? 'working'
		: 'done'

export function placeRuns(
	runs: Array<RunType>,
	messages: Array<CrewMessageType>,
	agents: ReadonlyArray<CrewKey>
): RunParts {
	const parts: RunParts = { above: new Map(), under: new Map(), live: [] }
	for (const run of runs) {
		// A side-thread's replies are not in `messages`; its run stays whole.
		const posts = run.thread ? [] : postsOf(run, messages)
		if (!posts.length) {
			if (working(run)) {
				if (run.steps.length && agents.includes(run.agent)) parts.live.push(run)
			} else if (run.messageId && hasContent(run)) {
				push(parts.under, run.messageId, run)
			}
			continue
		}

		let rest = run.steps
		let dropped = run.dropped
		const before: Array<{ post: CrewMessageType; part: RunType }> = []
		for (const post of posts) {
			const cut = rest.findIndex((step) => time(step.at) >= time(post.at))
			const steps = cut === -1 ? rest : rest.slice(0, cut)
			rest = cut === -1 ? [] : rest.slice(cut)
			const part: RunType = {
				...run,
				steps,
				dropped: steps.length ? dropped : 0,
				outcome: partOutcome(run, steps),
				error: null,
			}
			if (steps.length) dropped = 0
			if (hasContent(part)) before.push({ post, part })
		}

		const last = posts.at(-1)!
		const tail: RunType = { ...run, steps: rest, dropped }
		if (working(run)) {
			if (rest.length && agents.includes(run.agent)) parts.live.push(tail)
		} else if (rest.length + dropped > 0) {
			push(parts.under, last.id, tail)
		} else if (before.length) {
			const final = before.at(-1)!
			final.part = { ...final.part, outcome: run.outcome, error: run.error }
		}
		for (const { post, part } of before) push(parts.above, post.id, part)
	}
	return parts
}
