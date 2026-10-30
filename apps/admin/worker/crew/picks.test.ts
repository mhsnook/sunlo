import { describe, expect, it } from 'vitest'
import { displayName } from '../../shared/crew'
import { paintingPickReports, pickReports, sketchPickReports } from './picks'

describe('paintingPickReports', () => {
	const painting = {
		id: 3,
		label: 'B',
		style: 'Risograph',
		model: 'black-forest-labs/flux-3-image-klein' as const,
		image: { id: 41, width: 1024, height: 1280 },
		svg: null,
		error: null,
	}

	it('tells the agent where to look, and its room’s principal', () => {
		const [painted, principal] = paintingPickReports({
			agent: 'product-2',
			title: 'The review screen',
			painting,
			by: 'sam',
		})
		const said =
			'sam went with painting B of "The review screen", in the Risograph style'
		expect(painted.agent).toBe('product-2')
		expect(painted.body).toContain(`${said}. It is image 41.`)
		expect(painted.body).toContain('look_at_image')
		expect(painted.body).toContain('Design document')
		expect(principal.agent).toBe('product-1')
		expect(principal.body).toContain(said)
		expect(principal.body).toContain('propose_charter')
	})

	it('points at an SVG’s rendering', () => {
		const [painted] = paintingPickReports({
			agent: 'product-2',
			title: 'An icon',
			painting: {
				...painting,
				image: null,
				svg: { id: 5, title: 't', width: 24, height: 24, png: 42 },
			},
			by: 'sam',
		})
		expect(painted.body).toContain(
			'It is SVG 5; look at its rendering, image 42.'
		)
	})
})

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
