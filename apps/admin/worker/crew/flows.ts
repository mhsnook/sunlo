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

// A new request replaces any earlier one on the step.
export const requestStep = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	request: StepRequestType
) => withStep(steps, index, (step) => ({ ...step, request }))

// product-2 answered with new versions of a step, on the card `replyId`.
export const replyWithVersions = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	replyId: string,
	by: string
) =>
	withStep(steps, index, (step) => ({
		...step,
		request: {
			...(step.request ?? { note: '', by }),
			kind: 'redo',
			reply: replyId,
		},
	}))

// A version becomes the step's picture. Going with it among other versions
// approves it; a lone version still waits for the admin.
export const adoptVersion = (
	steps: ReadonlyArray<SketchType>,
	index: number,
	version: SketchVersionType,
	approved: boolean
) =>
	withStep(steps, index, (step) => ({
		...step,
		versions: [...(step.versions ?? []), version],
		request: undefined,
		status: approved ? 'approved' : undefined,
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
		request: step.request?.kind === 'expand' ? undefined : step.request,
	}))

// Approving the whole flow approves each step that is not waiting on a
// redo.
export const approveFlow = (steps: ReadonlyArray<SketchType>) =>
	steps.map((step) =>
		step.request?.kind === 'redo'
			? step
			: { ...step, status: 'approved' as const }
	)

export const APPROVE_FLOW = { id: 'approve-flow', label: 'Approve the flow' }

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
	request: StepRequestType
}) {
	const { title, index, step, request } = input
	const id = currentSketch(step).id
	const note = request.note ? ` Their note: ${request.note}` : ''
	if (request.kind === 'redo') {
		const count = request.count ?? DEFAULT_REDO_VERSIONS
		const versions = count === 1 ? 'one new version' : `${count} new versions`
		return `${request.by} wants ${stepName(title, index, step)} drawn again.${note}\n\nRead it with read_sketch, then draw ${versions} with sketch_screens: layout "options", replaces ${id}. The card links to the flow, and the version the admin goes with becomes step ${stepLabel(index)}.`
	}
	return `${request.by} wants ${stepName(title, index, step)} expanded into a sub-flow.${note}\n\nDraw the sub-flow with sketch_screens: layout "flow", expands ${id}. Start from the screen this step shows, and end where the next step of the flow begins.`
}

// What product-2 notes, without waking, when the admin approves a step.
export const approvalNote = (
	title: string,
	index: number,
	step: SketchType,
	approved: boolean
) =>
	`${approved ? 'approved' : 'took back the approval of'} ${stepName(title, index, step)}`

// What a version becoming a step's picture means for the flow's document.
export const adoptedLine = (index: number, sketchId: number) =>
	`Step ${stepLabel(index)} is now sketch ${sketchId}; use that id in the flow's document.`

export const approvedFlowReport = (by: string, title: string) =>
	`${by} approved your flow "${title}": every step that is not being redrawn. Record it in the flow's document, with each step's current sketch.`
