import { describe, expect, it } from 'vitest'
import { currentSketch, stepLabel, type SketchType } from '../../shared/crew'
import {
	addSubflow,
	adoptVersion,
	approveFlow,
	findStep,
	replyWithVersions,
	requestStep,
	setApproval,
	stepRequestReport,
} from './flows'

const steps: Array<SketchType> = [
	{
		id: 10,
		label: '1',
		idea: 'Deck home',
		frame: 'phone',
		action: 'Tap Review',
	},
	{ id: 11, label: '2', idea: 'A card', frame: 'phone', action: 'Last card' },
	{ id: 12, label: '3', idea: 'Done', frame: 'phone' },
]

const redo = {
	kind: 'redo' as const,
	note: 'Too busy',
	count: 2,
	by: 'Ana',
}

describe('stepLabel', () => {
	it('numbers steps from 1', () => {
		expect([0, 1, 2].map(stepLabel)).toEqual(['1', '2', '3'])
	})
})

describe('a step redrawn', () => {
	it('carries the request, then the reply card, then the picked version', () => {
		const asked = requestStep(steps, 2, redo)
		expect(asked[2].request).toEqual(redo)
		expect(asked[0]).toBe(steps[0])

		const answered = replyWithVersions(asked, 2, 'card-2', 'Keiko')
		expect(answered[2].request).toEqual({ ...redo, reply: 'card-2' })

		const version = { id: 20, label: 'B', idea: 'Calmer', messageId: 'card-2' }
		const adopted = adoptVersion(answered, 2, version, true)
		expect(adopted[2]).toEqual({
			...steps[2],
			versions: [version],
			status: 'approved',
		})
		expect(currentSketch(adopted[2]).id).toBe(20)
		expect(findStep(adopted, 20)).toBe(2)
		expect(findStep(adopted, 12)).toBe(-1)
	})

	it('records a redo the agent drew without a button', () => {
		const answered = replyWithVersions(steps, 1, 'card-3', 'Keiko')
		expect(answered[1].request).toMatchObject({ kind: 'redo', reply: 'card-3' })
	})

	it('leaves a lone version unapproved', () => {
		const version = { id: 21, label: 'A', idea: 'Calmer', messageId: 'c' }
		expect(adoptVersion(steps, 0, version, false)[0].status).toBeUndefined()
	})
})

describe('approval', () => {
	it('approves and takes back one step', () => {
		const approved = setApproval(steps, 1, true)
		expect(approved[1].status).toBe('approved')
		expect(setApproval(approved, 1, false)[1].status).toBeUndefined()
	})

	it('approves the whole flow except a step being drawn again', () => {
		const flow = approveFlow(requestStep(steps, 1, redo))
		expect(flow.map((step) => step.status)).toEqual([
			'approved',
			undefined,
			'approved',
		])
	})
})

describe('addSubflow', () => {
	it('links the sub-flow and clears the expand request', () => {
		const asked = requestStep(steps, 0, { ...redo, kind: 'expand' })
		const expanded = addSubflow(asked, 0, 'flow-2')
		expect(expanded[0].subflows).toEqual(['flow-2'])
		expect(expanded[0].request).toBeUndefined()
	})
})

describe('stepRequestReport', () => {
	it('tells the agent which sketch to replace, and how many versions', () => {
		const body = stepRequestReport({
			title: 'First review',
			index: 2,
			step: steps[2],
			request: redo,
		})
		expect(body).toContain(
			'step 3 of your flow "First review" (sketch 12: Done)'
		)
		expect(body).toContain('Their note: Too busy')
		expect(body).toContain('2 new versions')
		expect(body).toContain('replaces 12')
	})

	it('names the current version once a step was redrawn', () => {
		const version = { id: 20, label: 'B', idea: 'Calmer', messageId: 'c' }
		const body = stepRequestReport({
			title: 'First review',
			index: 2,
			step: adoptVersion(steps, 2, version, true)[2],
			request: { ...redo, kind: 'expand', note: '' },
		})
		expect(body).toContain('expands 20')
		expect(body).not.toContain('Their note')
	})
})
