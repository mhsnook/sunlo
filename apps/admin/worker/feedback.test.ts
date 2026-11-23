import type { Sql } from 'postgres'
import { describe, expect, it } from 'vitest'
import type { FeedbackTriageType } from '../shared/feedback'
import { feedbackRows, withTriage, type FeedbackRowType } from './feedback'

const row = (id: string): FeedbackRowType => ({
	id,
	created_at: '2026-11-23T05:00:00.000Z',
	kind: 'bug',
	message: 'The review button did nothing',
	lang: null,
	page_url: '/learn',
	username: null,
	signed_in: false,
	contact_email: null,
	left_email: false,
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
function fakeSql(rows: Array<FeedbackRowType>, untriaged: number) {
	const calls: Array<Array<unknown>> = []
	const sql = (_strings: TemplateStringsArray, ...values: Array<unknown>) => {
		calls.push(values)
		return Promise.resolve(calls.length === 1 ? rows : [{ untriaged }])
	}
	return { sql: sql as unknown as Sql, calls }
}

describe('feedbackRows', () => {
	it('leaves out triaged rows only when asked, and counts untriaged either way', async () => {
		const { sql, calls } = fakeSql([row('a')], 3)
		const all = await feedbackRows(sql, {
			kind: null,
			triaged: ['b'],
			untriagedOnly: false,
			withEmail: false,
			limit: 50,
		})
		expect(all).toEqual({ rows: [row('a')], untriaged: 3 })
		expect(calls[0]).toContain('[]')
		expect(calls[1]).toEqual(['["b"]'])

		const open = fakeSql([], 3)
		await feedbackRows(open.sql, {
			kind: 'library',
			triaged: ['b'],
			untriagedOnly: true,
			withEmail: true,
			limit: 50,
		})
		expect(open.calls[0]).toContain('["b"]')
		expect(open.calls[0]).toContain('library')
	})
})

describe('withTriage', () => {
	it('attaches the triage of each row, or null', () => {
		const items = withTriage([row('a'), row('b')], [triage('b')])
		expect(items.map((item) => item.triage?.issue ?? null)).toEqual([null, 880])
	})
})
