import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActivityOverviewSchema, UserActivitySchema } from '../src/lib/stats'

// stats.ts pulls in the browser Supabase client, which needs VITE_* vars.
vi.mock('../../../src/lib/supabase-client', () => ({ default: {} }))

const getClaims = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getClaims } }),
}))

const OVERVIEW = {
	since: '2026-10-16T00:00:00+00:00',
	days: [
		{
			day: '2026-10-16',
			active_users: 1,
			new_users: 0,
			reviewers: 1,
			reviews: 3,
			cards_added: 0,
			decks_created: 0,
			phrases_added: 0,
			translations_added: 0,
			requests_added: 0,
			comments_added: 0,
			playlists_added: 0,
			chat_messages: 0,
		},
	],
	totals: {
		total_users: 11,
		onboarded_users: 9,
		active_users: 1,
		active_users_prev: 2,
		new_users: 0,
		new_users_prev: 1,
		reviews: 3,
		reviews_prev: 5,
	},
}

const USER_ACTIVITY = {
	most_active: [
		{
			uid: 'u1',
			username: 'ana',
			email: 'ana@example.test',
			actions: 3,
			reviews: 3,
			contributions: 0,
			active_days: 1,
			last_active_at: '2026-10-16T10:00:00+00:00',
			deck_langs: ['hin'],
		},
	],
	newest: [
		{
			uid: 'u2',
			username: null,
			email: 'new@example.test',
			created_at: '2026-10-16T09:00:00+00:00',
			last_sign_in_at: null,
			onboarded: false,
			deck_langs: null,
			reviews: 0,
		},
	],
}

let isAdmin = true
const end = vi.fn().mockResolvedValue(undefined)
const queries: Array<{ text: string; values: Array<unknown> }> = []
const sql = Object.assign(
	(strings: TemplateStringsArray, ...values: Array<unknown>) => {
		const text = strings.join('$')
		queries.push({ text, values })
		if (text.includes('public.admin_user')) {
			return Promise.resolve([{ is_admin: isAdmin }])
		}
		if (text.includes("'most_active'")) {
			return Promise.resolve([{ result: USER_ACTIVITY }])
		}
		return Promise.resolve([{ result: OVERVIEW }])
	},
	{ end }
)
const postgres = vi.fn(() => sql)
vi.mock('postgres', () => ({ default: postgres }))

const { default: app } = await import('./api')

const DATABASE_URL =
	'postgresql://admin_reader.ref:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres'

function makeEnv(overrides: Partial<Env> = {}) {
	return {
		SUPABASE_URL: 'http://supabase.test',
		SUPABASE_ANON_KEY: 'anon',
		ADMIN_DATABASE_URL: DATABASE_URL,
		...overrides,
	} as unknown as Env
}

function get(
	path: string,
	env = makeEnv(),
	token: string | null = 'user-token'
) {
	return app.request(
		path,
		{ headers: token ? { authorization: `Bearer ${token}` } : {} },
		env
	)
}

beforeEach(() => {
	isAdmin = true
	queries.length = 0
	end.mockClear()
	postgres.mockClear()
	getClaims.mockReset()
	getClaims.mockResolvedValue({
		data: { claims: { role: 'authenticated', sub: 'user-1' } },
		error: null,
	})
})

describe('auth', () => {
	it('rejects a request with no token', async () => {
		const res = await get('/api/activity-overview', makeEnv(), null)
		expect(res.status).toBe(401)
		expect(postgres).not.toHaveBeenCalled()
	})

	it('rejects the anon key', async () => {
		getClaims.mockResolvedValue({
			data: { claims: { role: 'anon' } },
			error: null,
		})
		expect((await get('/api/activity-overview')).status).toBe(401)
		expect(postgres).not.toHaveBeenCalled()
	})

	it('rejects a token that makes verification throw', async () => {
		getClaims.mockRejectedValue(new Error('Missing exp claim'))
		expect((await get('/api/activity-overview')).status).toBe(401)
	})

	it('rejects a signed-in user who is not an admin', async () => {
		isAdmin = false
		const res = await get('/api/activity-overview')
		expect(res.status).toBe(403)
		expect(queries).toHaveLength(1)
		expect(queries[0].values).toEqual(['user-1'])
		expect(end).toHaveBeenCalledOnce()
	})

	it('fails with a clear error when the database secret is missing', async () => {
		const res = await get(
			'/api/activity-overview',
			makeEnv({ ADMIN_DATABASE_URL: '' })
		)
		expect(res.status).toBe(500)
		expect(await res.json()).toEqual({
			error: 'ADMIN_DATABASE_URL is not set on this Worker',
		})
		expect(postgres).not.toHaveBeenCalled()
	})
})

describe('GET /api/activity-overview', () => {
	it.each(['0', '91', 'abc', '7.5'])('rejects days=%s', async (days) => {
		const res = await get(`/api/activity-overview?days=${days}`)
		expect(res.status).toBe(400)
		expect(queries).toHaveLength(1)
	})

	it('returns the overview shape the app parses', async () => {
		const res = await get('/api/activity-overview?days=14')
		expect(res.status).toBe(200)
		const body = await res.json()
		expect(ActivityOverviewSchema.parse(body)).toEqual(OVERVIEW)
		expect(queries[1].values).toContain(14)
		expect(postgres).toHaveBeenCalledWith(
			DATABASE_URL,
			expect.objectContaining({ prepare: false, ssl: 'require', max: 1 })
		)
		expect(end).toHaveBeenCalledOnce()
	})
})

describe('GET /api/user-activity', () => {
	it('rejects a bad limit', async () => {
		expect((await get('/api/user-activity?days=7&limit=0')).status).toBe(400)
		expect((await get('/api/user-activity?days=7&limit=201')).status).toBe(400)
	})

	it('returns the user activity shape the app parses, with a default limit', async () => {
		const res = await get('/api/user-activity?days=30')
		expect(res.status).toBe(200)
		expect(UserActivitySchema.parse(await res.json())).toEqual(USER_ACTIVITY)
		expect(queries[1].values).toEqual(expect.arrayContaining([30, 20]))
	})
})
