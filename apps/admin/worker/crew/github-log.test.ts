import { createHmac } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { GithubItemType } from '../../shared/crew'
import {
	GITHUB_TITLE_MAX,
	githubItemOf,
	githubItems,
	githubWebhook,
	plainLine,
	pruneGithubLog,
	takeDelivery,
	verifyGithubSignature,
	writeGithubItem,
} from './github-log'
import type { Sql } from './paintings'

const REPO = 'mhsnook/sunlo'
const encoder = new TextEncoder()
const sign = (secret: string, body: string) =>
	`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

describe('verifyGithubSignature', () => {
	const body = '{"zen":"Keep it logically awesome."}'

	it('accepts the HMAC of the raw body', async () => {
		expect(
			await verifyGithubSignature(
				's3cret',
				encoder.encode(body),
				sign('s3cret', body)
			)
		).toBe(true)
	})

	it('refuses another secret, another body, and a malformed header', async () => {
		const bytes = encoder.encode(body)
		expect(
			await verifyGithubSignature('s3cret', bytes, sign('other', body))
		).toBe(false)
		expect(
			await verifyGithubSignature(
				's3cret',
				encoder.encode(`${body} `),
				sign('s3cret', body)
			)
		).toBe(false)
		expect(
			await verifyGithubSignature(
				's3cret',
				bytes,
				sign('s3cret', body).replace('sha256=', 'sha1=')
			)
		).toBe(false)
		expect(await verifyGithubSignature('s3cret', bytes, 'sha256=abc')).toBe(
			false
		)
		expect(await verifyGithubSignature('s3cret', bytes, null)).toBe(false)
	})

	it('refuses everything without a secret', async () => {
		expect(
			await verifyGithubSignature(
				undefined,
				encoder.encode(body),
				sign('', body)
			)
		).toBe(false)
		expect(
			await verifyGithubSignature('', encoder.encode(body), sign('', body))
		).toBe(false)
	})
})

const issue = (over: Record<string, unknown> = {}) => ({
	number: 851,
	title: 'Onboarding asks twice',
	html_url: `https://github.com/${REPO}/issues/851`,
	state: 'open',
	labels: [{ name: 'epic' }, { name: 'from-crew' }],
	milestone: { title: 'Onboarding' },
	updated_at: '2026-10-30T10:00:00Z',
	closed_at: null,
	...over,
})

const pull = (over: Record<string, unknown> = {}) => ({
	...issue({
		number: 852,
		title: 'Ask once',
		html_url: `https://github.com/${REPO}/pull/852`,
		labels: [],
		milestone: null,
	}),
	merged: false,
	merged_at: null,
	...over,
})

const payload = (action: string, body: Record<string, unknown>) => ({
	action,
	repository: { full_name: REPO },
	sender: { login: 'someone' },
	...body,
})

describe('githubWebhook', () => {
	it('answers a ping', () => {
		expect(githubWebhook('ping', { zen: 'hi' }, REPO)).toEqual({ kind: 'ping' })
	})

	it('posts a line for an opened, closed or reopened issue', () => {
		const opened = githubWebhook(
			'issues',
			payload('opened', { issue: issue() }),
			REPO
		)
		expect(opened).toEqual({
			kind: 'item',
			item: {
				number: 851,
				kind: 'issue',
				title: 'Onboarding asks twice',
				url: `https://github.com/${REPO}/issues/851`,
				labels: ['epic', 'from-crew'],
				milestone: 'Onboarding',
				state: 'open',
				updatedAt: '2026-10-30T10:00:00Z',
				closedAt: null,
			},
			event: {
				kind: 'issue',
				action: 'opened',
				number: 851,
				title: 'Onboarding asks twice',
				url: `https://github.com/${REPO}/issues/851`,
			},
		})
		const closed = githubWebhook(
			'issues',
			payload('closed', {
				issue: issue({ state: 'closed', closed_at: '2026-10-31T09:00:00Z' }),
			}),
			REPO
		)
		expect(closed.kind === 'item' && closed.event?.action).toBe('closed')
		expect(closed.kind === 'item' && closed.item.closedAt).toBe(
			'2026-10-31T09:00:00Z'
		)
		const reopened = githubWebhook(
			'issues',
			payload('reopened', { issue: issue() }),
			REPO
		)
		expect(reopened.kind === 'item' && reopened.event?.action).toBe('reopened')
	})

	it('tells a merged pull request from one closed unmerged', () => {
		const merged = githubWebhook(
			'pull_request',
			payload('closed', {
				pull_request: pull({
					state: 'closed',
					merged: true,
					merged_at: '2026-10-31T09:00:00Z',
					closed_at: '2026-10-31T09:00:00Z',
				}),
			}),
			REPO
		)
		expect(merged.kind === 'item' && merged.event).toMatchObject({
			kind: 'pr',
			action: 'merged',
			number: 852,
		})
		expect(merged.kind === 'item' && merged.item.state).toBe('merged')
		const closed = githubWebhook(
			'pull_request',
			payload('closed', {
				pull_request: pull({
					state: 'closed',
					closed_at: '2026-10-31T09:00:00Z',
				}),
			}),
			REPO
		)
		expect(closed.kind === 'item' && closed.event?.action).toBe('closed')
		expect(closed.kind === 'item' && closed.item.state).toBe('closed')
		const opened = githubWebhook(
			'pull_request',
			payload('opened', { pull_request: pull() }),
			REPO
		)
		expect(opened.kind === 'item' && opened.event?.action).toBe('opened')
		const reopened = githubWebhook(
			'pull_request',
			payload('reopened', { pull_request: pull() }),
			REPO
		)
		expect(reopened.kind === 'item' && reopened.event?.action).toBe('reopened')
	})

	it('updates the copy without a line for other actions', () => {
		const labeled = githubWebhook(
			'issues',
			payload('labeled', { issue: issue() }),
			REPO
		)
		expect(labeled.kind).toBe('item')
		expect(labeled.kind === 'item' && labeled.event).toBeNull()
		const synced = githubWebhook(
			'pull_request',
			payload('synchronize', { pull_request: pull() }),
			REPO
		)
		expect(synced.kind === 'item' && synced.event).toBeNull()
	})

	it('removes a deleted or transferred issue', () => {
		expect(
			githubWebhook('issues', payload('deleted', { issue: issue() }), REPO)
		).toEqual({ kind: 'remove', number: 851 })
		expect(
			githubWebhook('issues', payload('transferred', { issue: issue() }), REPO)
		).toEqual({ kind: 'remove', number: 851 })
	})

	it('ignores other events, other repositories and broken payloads', () => {
		expect(
			githubWebhook('push', payload('opened', { issue: issue() }), REPO).kind
		).toBe('ignore')
		expect(githubWebhook(undefined, {}, REPO).kind).toBe('ignore')
		expect(
			githubWebhook(
				'issues',
				{
					...payload('opened', { issue: issue() }),
					repository: { full_name: 'x/y' },
				},
				REPO
			).kind
		).toBe('ignore')
		expect(
			githubWebhook(
				'issues',
				payload('opened', {
					issue: issue({ html_url: 'https://example.com/issues/851' }),
				}),
				REPO
			).kind
		).toBe('ignore')
		expect(githubWebhook('issues', payload('opened', {}), REPO).kind).toBe(
			'ignore'
		)
		expect(githubWebhook('issues', 'not an object', REPO).kind).toBe('ignore')
	})

	it('keeps titles to one bounded line of plain text', () => {
		const result = githubWebhook(
			'issues',
			payload('opened', {
				issue: issue({
					title: `Line one\nline two‮evil​ ${'x'.repeat(400)}`,
				}),
			}),
			REPO
		)
		const title = result.kind === 'item' ? result.item.title : ''
		expect(title).not.toMatch(/[\n‮​]/)
		expect(title.startsWith('Line one line two evil')).toBe(true)
		expect(title.length).toBe(GITHUB_TITLE_MAX)
		expect(title.endsWith('…')).toBe(true)
	})
})

describe('plainLine', () => {
	it('collapses whitespace and leaves short text alone', () => {
		expect(plainLine('  a \t b\r\nc ', 10)).toBe('a b c')
	})
})

describe('githubItemOf', () => {
	it('reads a pull request from the REST issue list', () => {
		expect(
			githubItemOf(
				issue({
					state: 'closed',
					pull_request: { merged_at: '2026-10-31T09:00:00Z' },
					closed_at: '2026-10-31T09:00:00Z',
				}),
				REPO
			)
		).toMatchObject({ kind: 'pr', state: 'merged' })
		expect(githubItemOf(issue(), REPO)).toMatchObject({
			kind: 'issue',
			state: 'open',
		})
	})
})

const item = (over: Partial<GithubItemType> = {}): GithubItemType => ({
	number: 851,
	kind: 'issue',
	title: 'Onboarding asks twice',
	url: `https://github.com/${REPO}/issues/851`,
	labels: [],
	milestone: null,
	state: 'open',
	updatedAt: '2026-10-30T10:00:00Z',
	closedAt: null,
	...over,
})

// The tables these read, as the room creates them.
function room() {
	const db = new DatabaseSync(':memory:')
	db.exec(`
		create table github_item (
			number integer primary key, kind text not null, title text not null,
			url text not null, labels text not null default '[]', milestone text,
			state text not null, updated_at text not null, closed_at text
		);
		create table github_delivery (id text primary key, at text not null);
	`)
	const sql: Sql = <T>(
		strings: TemplateStringsArray,
		...values: Array<string | number | boolean | null>
	) =>
		db
			.prepare(strings.join('?'))
			.all(
				...values.map((value) =>
					typeof value === 'boolean' ? Number(value) : value
				)
			) as Array<T>
	return sql
}

const openNumbers = (sql: Sql) =>
	sql<{
		number: number
	}>`select number from github_item where state = 'open' order by number`.map(
		(row) => row.number
	)

describe('takeDelivery', () => {
	it('passes a delivery id once', () => {
		const sql = room()
		expect(takeDelivery(sql, 'a')).toBe(true)
		expect(takeDelivery(sql, 'a')).toBe(false)
		expect(takeDelivery(sql, 'b')).toBe(true)
	})

	it('forgets a delivery a week after the log is pruned', () => {
		const sql = room()
		const at = Date.parse('2026-10-01T00:00:00Z')
		expect(takeDelivery(sql, 'a', at)).toBe(true)
		pruneGithubLog(sql, at + 6 * 86_400_000)
		expect(takeDelivery(sql, 'a', at + 6 * 86_400_000)).toBe(false)
		pruneGithubLog(sql, at + 8 * 86_400_000)
		expect(takeDelivery(sql, 'a', at + 8 * 86_400_000)).toBe(true)
	})
})

describe('the github_item table', () => {
	it('never lets an older state overwrite a newer one', () => {
		const sql = room()
		writeGithubItem(
			sql,
			item({ state: 'closed', updatedAt: '2026-10-31T09:00:00Z' })
		)
		writeGithubItem(
			sql,
			item({ state: 'open', updatedAt: '2026-10-30T09:00:00Z' })
		)
		expect(githubItems(sql, Date.parse('2026-10-31T10:00:00Z'))[0].state).toBe(
			'closed'
		)
		writeGithubItem(
			sql,
			item({ state: 'open', updatedAt: '2026-10-31T11:00:00Z' })
		)
		expect(openNumbers(sql)).toEqual([851])
	})

	it('lists open items first and drops closed ones after two weeks', () => {
		const sql = room()
		const now = Date.parse('2026-10-31T12:00:00Z')
		writeGithubItem(sql, item({ number: 1, updatedAt: '2026-10-01T00:00:00Z' }))
		writeGithubItem(
			sql,
			item({
				number: 2,
				state: 'merged',
				kind: 'pr',
				updatedAt: '2026-10-30T00:00:00Z',
				closedAt: '2026-10-30T00:00:00Z',
			})
		)
		writeGithubItem(
			sql,
			item({
				number: 3,
				state: 'closed',
				updatedAt: '2026-10-02T00:00:00Z',
				closedAt: '2026-10-02T00:00:00Z',
			})
		)
		expect(githubItems(sql, now).map((i) => i.number)).toEqual([1, 2])
		pruneGithubLog(sql, now)
		writeGithubItem(sql, item({ number: 4, updatedAt: '2026-10-31T00:00:00Z' }))
		expect(githubItems(sql, now).map((i) => i.number)).toEqual([4, 1, 2])
		expect(githubItems(sql, now)[2].labels).toEqual([])
	})
})
