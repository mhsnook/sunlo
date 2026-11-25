import type { Sql } from 'postgres'
import { describe, expect, it } from 'vitest'
import type { FeedbackTriageType } from '../shared/feedback'
import {
	feedbackMeta,
	joinFeedback,
	type FeedbackMetaType,
	type FeedbackTextType,
} from './feedback'

const meta = (id: string): FeedbackMetaType => ({
	id,
	created_at: '2026-11-23T05:00:00.000Z',
	kind: 'bug',
	lang: null,
	username: null,
	signed_in: false,
})

const text = (id: string, email: string | null): FeedbackTextType => ({
	id,
	message: 'The review button did nothing',
	page_url: '/learn',
	contact_email: email,
})

const triage = (feedbackId: string): FeedbackTriageType => ({
	feedback_id: feedbackId,
	outcome: 'filed',
	room: 'product',
	issue: 880,
	note: null,
	agent: 'product-1',
	at: '2026-11-23T07:00:00.000Z',
})

// Records each query's parameters, in order, and answers the row query and
// then the count query.
function fakeSql(rows: Array<FeedbackMetaType>, untriaged: number) {
	const calls: Array<Array<unknown>> = []
	const sql = (_strings: TemplateStringsArray, ...values: Array<unknown>) => {
		calls.push(values)
		return Promise.resolve(calls.length === 1 ? rows : [{ untriaged }])
	}
	return { sql: sql as unknown as Sql, calls }
}

describe('feedbackMeta', () => {
	it('leaves out triaged rows only when asked, and counts untriaged either way', async () => {
		const { sql, calls } = fakeSql([meta('a')], 3)
		const all = await feedbackMeta(sql, {
			kind: null,
			triaged: ['b'],
			untriagedOnly: false,
			limit: 50,
		})
		expect(all).toEqual({ rows: [meta('a')], untriaged: 3 })
		expect(calls[0]).toContain('[]')
		expect(calls[1]).toEqual(['["b"]'])

		const open = fakeSql([], 3)
		await feedbackMeta(open.sql, {
			kind: 'library',
			triaged: ['b'],
			untriagedOnly: true,
			limit: 50,
		})
		expect(open.calls[0]).toContain('["b"]')
		expect(open.calls[0]).toContain('library')
	})
})

describe('joinFeedback', () => {
	it('attaches each row its text and triage', () => {
		const items = joinFeedback(
			[meta('a'), meta('b')],
			[text('a', null), text('b', 'x@example.com')],
			[triage('b')],
			{ withEmail: true }
		)
		expect(items.map((item) => item.triage?.issue ?? null)).toEqual([null, 880])
		expect(items[1].contact_email).toBe('x@example.com')
		expect(items[0].message).toBe('The review button did nothing')
	})

	it('withholds the email but says whether there was one', () => {
		const [item] = joinFeedback([meta('a')], [text('a', 'x@example.com')], [], {
			withEmail: false,
		})
		expect(item.contact_email).toBeNull()
		expect(item.left_email).toBe(true)
	})
})
