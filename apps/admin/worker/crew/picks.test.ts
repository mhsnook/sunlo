import { describe, expect, it } from 'vitest'
import { displayName } from '../../shared/crew'
import { pickReports, sketchPickReports } from './picks'

const views = {
	original: {
		agent: 'product-1' as const,
		body: 'Ship the start flow this week.',
	},
	other: {
		agent: 'product-2' as const,
		body: 'Wait a week: it asks for three things on one screen.',
	},
}

describe('pickReports', () => {
	it('tells both agents which view the admin went with', () => {
		const [principal, associate] = pickReports({
			...views,
			chosen: 'other',
			by: 'sam',
		})
		expect(principal.agent).toBe('product-1')
		expect(associate.agent).toBe('product-2')
		const said = `sam went with ${displayName('product-2')}'s view: "Wait a week: it asks for three things on one screen." over ${displayName('product-1')}'s: "Ship the start flow this week."`
		expect(principal.body).toContain(said)
		expect(associate.body).toContain(said)
	})

	it('asks only the principal to consider a charter entry', () => {
		const [principal, associate] = pickReports({
			...views,
			chosen: 'original',
			by: 'sam',
		})
		expect(principal.body).toContain(
			"propose it for the Product room's charter with propose_charter"
		)
		expect(associate.body).not.toContain('propose_charter')
	})

	it('shortens a long view', () => {
		const [principal] = pickReports({
			original: { agent: 'product-1', body: 'x'.repeat(500) },
			other: views.other,
			chosen: 'original',
			by: 'sam',
		})
		expect(principal.body).toContain(`${'x'.repeat(199)}…`)
	})
})

describe('sketchPickReports', () => {
	const sketch = {
		id: 7,
		label: 'B',
		idea: 'One card at a time, full screen',
		frame: 'phone' as const,
	}

	it('tells the agent who drew it and its room’s principal', () => {
		const [drew, principal] = sketchPickReports({
			agent: 'product-2',
			title: 'The review screen',
			sketch,
			by: 'sam',
		})
		const said =
			'sam went with sketch B of "The review screen": One card at a time, full screen'
		expect(drew).toEqual({
			agent: 'product-2',
			body: `${said}. Its HTML is sketch 7.`,
		})
		expect(principal.agent).toBe('product-1')
		expect(principal.body).toContain(said)
		expect(principal.body).toContain('propose_charter')
	})

	it('tells a principal who drew it only once', () => {
		expect(
			sketchPickReports({
				agent: 'product-1',
				title: 'The review screen',
				sketch,
				by: 'sam',
			})
		).toHaveLength(1)
	})
})
