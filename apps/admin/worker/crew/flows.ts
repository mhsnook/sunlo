import {
	currentSketch,
	DEFAULT_REDO_VERSIONS,
	stepLabel,
	type SketchType,
	type SketchVersionType,
	type StepRequestType,
} from '../../shared/crew'

// The step whose current picture is this sketch, or -1.
export const findStep = (steps: ReadonlyArray<SketchType>, sketchId: number) =>
	steps.findIndex((step) => currentSketch(step).id === sketchId)

const withStep = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	change: (step: SketchType) => SketchType
) => steps.map((step, i) => (i === index ? change(step) : step))

export const setApproval = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	approved: boolean
) =>
	withStep(steps, index, (step) => ({
		...step,
		status: approved ? 'approved' : undefined,
	}))

// A new request replaces an earlier one of the same kind. A redo and an
// expand can wait side by side.
export const requestStep = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	kind: 'redo' | 'expand',
	request: StepRequestType
) => withStep(steps, index, (step) => ({ ...step, [kind]: request }))

// product-2 answered with new versions of a step, on the card `replyId`.
export const replyWithVersions = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	replyId: string,
	by: string
) =>
	withStep(steps, index, (step) => ({
		...step,
		redo: { ...(step.redo ?? { note: '', by }), reply: replyId },
	}))

// The new versions with the step's current picture among them at
// `position`, so the admin can go with what they had without knowing it.
export const mixInCurrent = <T>(
	versions: ReadonlyArray<T>,
	current: T,
	position: number
) => [...versions.slice(0, position), current, ...versions.slice(position)]

// The admin went with a version on the card `cardId`. The step's current
// picture may be among them, and then the step keeps it. A redo the admin
// asked for after that card stays open.
export const pickVersion = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	version: SketchVersionType,
	cardId: string
) =>
	withStep(steps, index, (step) => ({
		...step,
		versions:
			version.id === currentSketch(step).id
				? step.versions
				: [...(step.versions ?? []), version],
		redo: step.redo?.reply === cardId ? undefined : step.redo,
		status: 'approved',
	}))

// product-2 expanded a step into the sub-flow on the card `flowId`.
export const addSubflow = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	flowId: string
) =>
	withStep(steps, index, (step) => ({
		...step,
		subflows: [...(step.subflows ?? []), flowId],
		expand: undefined,
	}))

export const approveFlow = (steps: ReadonlyArray<SketchType>) =>
	steps.map((step) => ({ ...step, status: 'approved' as const }))

const stepName = (title: string, index: number, step: SketchType) => {
	const current = currentSketch(step)
	return `step ${stepLabel(index)} of your flow "${title}" (sketch ${current.id}: ${current.idea})`
}

// What product-2 hears when the admin asks for a step to be redrawn or
// expanded. It wakes product-2.
export function stepRequestReport(input: {
	title: string
	index: number
	step: SketchType
	kind: 'redo' | 'expand'
	request: StepRequestType
}) {
	const { title, index, step, kind, request } = input
	const id = currentSketch(step).id
	const note = request.note ? ` Their note: ${request.note}` : ''
	if (kind === 'redo') {
		const count = request.count ?? DEFAULT_REDO_VERSIONS
		const versions = count === 1 ? 'one new version' : `${count} new versions`
		return `${request.by} wants ${stepName(title, index, step)} drawn again.${note}\n\nRead it with read_sketch, then draw ${versions} with sketch_screens: layout "options", replaces ${id}. The room adds the step's current picture among your versions, unmarked, so the admin can keep it without knowing; do not say which one it is. The version the admin goes with becomes step ${stepLabel(index)}.`
	}
	return `${request.by} wants ${stepName(title, index, step)} expanded into a sub-flow.${note}\n\nDraw the sub-flow with sketch_screens: layout "flow", expands ${id}. Start from the screen this step shows, and end where the next step of the flow begins.`
}

// What product-2 notes, without waking, when the admin approves a step or
// the whole flow.
export const approvalNote = (
	title: string,
	approval:
		| { index: number; step: SketchType; approved: boolean }
		| { all: true }
) =>
	'all' in approval
		? `approved every step of your flow "${title}"; record it in the flow's document, with each step's current sketch`
		: `${approval.approved ? 'approved' : 'took back the approval of'} ${stepName(title, approval.index, approval.step)}`

// What a pick means for the flow's document.
export const pickedLine = (index: number, sketchId: number, kept: boolean) =>
	kept
		? `That was the step's current picture, so step ${stepLabel(index)} keeps sketch ${sketchId}.`
		: `Step ${stepLabel(index)} is now sketch ${sketchId}; use that id in the flow's document.`
