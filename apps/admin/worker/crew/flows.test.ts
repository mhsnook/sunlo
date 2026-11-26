import { describe, expect, it } from 'vitest'
import { currentSketch, stepLabel, type SketchType } from '../../shared/crew'
import {
	addSubflow,
	approveFlow,
	findStep,
	mixInCurrent,
	pickVersion,
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

const redo = { note: 'Too busy', count: 2, by: 'Ana' }

describe('stepLabel', () => {
	it('numbers steps from 1', () => {
		expect([0, 1, 2].map(stepLabel)).toEqual(['1', '2', '3'])
	})
})

describe('a step redrawn', () => {
	it('carries the request, then the reply card, then the picked version', () => {
		const asked = requestStep(steps, 2, 'redo', redo)
		expect(asked[2].redo).toEqual(redo)
		expect(asked[0]).toBe(steps[0])

		const answered = replyWithVersions(asked, 2, 'card-2', 'Keiko')
		expect(answered[2].redo).toEqual({ ...redo, reply: 'card-2' })

		const version = { id: 20, label: 'B', idea: 'Calmer', messageId: 'card-2' }
		const picked = pickVersion(answered, 2, version, 'card-2')
		expect(picked[2]).toEqual({
			...steps[2],
			versions: [version],
			redo: undefined,
			status: 'approved',
		})
		expect(currentSketch(picked[2]).id).toBe(20)
		expect(findStep(picked, 20)).toBe(2)
		expect(findStep(picked, 12)).toBe(-1)
	})

	it('keeps the current picture when the admin goes with it', () => {
		const answered = replyWithVersions(steps, 2, 'card-2', 'Keiko')
		const current = { id: 12, label: 'C', idea: 'Done', messageId: 'card-2' }
		const picked = pickVersion(answered, 2, current, 'card-2')
		expect(picked[2].versions).toBeUndefined()
		expect(picked[2].redo).toBeUndefined()
		expect(currentSketch(picked[2]).id).toBe(12)
	})

	it('leaves a later redo open when an older card is picked', () => {
		const later = requestStep(
			replyWithVersions(steps, 1, 'card-1', 'Keiko'),
			1,
			'redo',
			redo
		)
		const version = { id: 30, label: 'A', idea: 'Older', messageId: 'card-1' }
		expect(pickVersion(later, 1, version, 'card-1')[1].redo).toEqual(redo)
	})

	it('records a redo the agent drew without a button', () => {
		const answered = replyWithVersions(steps, 1, 'card-3', 'Keiko')
		expect(answered[1].redo).toMatchObject({ reply: 'card-3' })
	})
})

describe('mixInCurrent', () => {
	it('puts the current picture at the given place among the new ones', () => {
		expect(mixInCurrent(['a', 'b'], 'now', 0)).toEqual(['now', 'a', 'b'])
		expect(mixInCurrent(['a', 'b'], 'now', 1)).toEqual(['a', 'now', 'b'])
		expect(mixInCurrent(['a', 'b'], 'now', 2)).toEqual(['a', 'b', 'now'])
	})
})

describe('approval', () => {
	it('approves and takes back one step', () => {
		const approved = setApproval(steps, 1, true)
		expect(approved[1].status).toBe('approved')
		expect(setApproval(approved, 1, false)[1].status).toBeUndefined()
	})

	it('approves every step, even one being drawn again', () => {
		const flow = approveFlow(requestStep(steps, 1, 'redo', redo))
		expect(flow.map((step) => step.status)).toEqual([
			'approved',
			'approved',
			'approved',
		])
	})
})

describe('a redo and an expand side by side', () => {
	it('keeps both, and the sub-flow clears only the expand', () => {
		const asked = requestStep(
			requestStep(steps, 0, 'redo', redo),
			0,
			'expand',
			{ note: 'Empty deck?', by: 'Ana' }
		)
		expect(asked[0].redo).toEqual(redo)
		const expanded = addSubflow(asked, 0, 'flow-2')
		expect(expanded[0].subflows).toEqual(['flow-2'])
		expect(expanded[0].expand).toBeUndefined()
		expect(expanded[0].redo).toEqual(redo)
	})
})

describe('stepRequestReport', () => {
	it('tells the agent which sketch to replace, and how many versions', () => {
		const body = stepRequestReport({
			title: 'First review',
			index: 2,
			step: steps[2],
			kind: 'redo',
			request: redo,
		})
		expect(body).toContain(
			'step 3 of your flow "First review" (sketch 12: Done)'
		)
		expect(body).toContain('Their note: Too busy')
		expect(body).toContain('2 new versions')
		expect(body).toContain('replaces 12')
		expect(body).toContain('current picture among your versions')
	})

	it('names the current version once a step was redrawn', () => {
		const version = { id: 20, label: 'B', idea: 'Calmer', messageId: 'c' }
		const body = stepRequestReport({
			title: 'First review',
			index: 2,
			step: pickVersion(steps, 2, version, 'c')[2],
			kind: 'expand',
			request: { note: '', by: 'Ana' },
		})
		expect(body).toContain('expands 20')
		expect(body).not.toContain('Their note')
	})
})
