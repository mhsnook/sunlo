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
let adminCheck: Promise<unknown> | undefined
const end = vi.fn().mockResolvedValue(undefined)
const queries: Array<{ text: string; values: Array<unknown> }> = []
const sql = Object.assign(
	(strings: TemplateStringsArray, ...values: Array<unknown>) => {
		const text = strings.join('$')
		queries.push({ text, values })
		if (text.includes('public.admin_user')) {
			return adminCheck ?? Promise.resolve([{ is_admin: isAdmin }])
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

const { createApi } = await import('./api')
const app = createApi()

const HYPERDRIVE_URL = 'postgresql://admin_reader:pw@hyperdrive.local/postgres'

function makeEnv() {
	return {
		SUPABASE_URL: 'http://supabase.test',
		SUPABASE_ANON_KEY: 'anon',
		HYPERDRIVE: { connectionString: HYPERDRIVE_URL },
	} as unknown as Env
}

function get(
	path: string,
	env = makeEnv(),
	token: string | null = 'user-token',
	method = 'GET'
) {
	return app.request(
		path,
		{ method, headers: token ? { authorization: `Bearer ${token}` } : {} },
		env
	)
}

beforeEach(() => {
	isAdmin = true
	adminCheck = undefined
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
		expect(queries[0].values).toEqual(['user-1', 'user-1'])
		expect(end).toHaveBeenCalledOnce()
	})

	it('answers 500 and closes the connection when the admin check throws', async () => {
		adminCheck = Promise.reject(new Error('password authentication failed'))
		const res = await get('/api/activity-overview')
		expect(res.status).toBe(500)
		expect(await res.json()).toEqual({ error: 'The admin API failed' })
		expect(end).toHaveBeenCalledOnce()
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
		expect(queries.at(-1)?.values).toContain(14)
		expect(postgres).toHaveBeenCalledWith(
			HYPERDRIVE_URL,
			expect.objectContaining({ max: 1, fetch_types: false })
		)
		// The admin check and the overview each open and close a connection.
		expect(end).toHaveBeenCalledTimes(postgres.mock.calls.length)
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
		expect(queries.at(-1)?.values).toEqual(expect.arrayContaining([30, 20]))
	})
})

describe('GET /api/crew/live', () => {
	it('rejects a socket with no token', async () => {
		const res = await get('/api/crew/live', makeEnv(), null)
		expect(res.status).toBe(401)
		expect(postgres).not.toHaveBeenCalled()
	})

	it('reads the token from the query string, because a socket has no headers', async () => {
		const res = await get('/api/crew/live?token=socket-token', makeEnv(), null)
		// 404: worker/api.ts let it through, and only .flue/app.ts mounts it.
		expect(res.status).toBe(404)
		expect(getClaims).toHaveBeenCalledWith('socket-token')
	})

	it('ignores a query token on every other route', async () => {
		const res = await get(
			'/api/activity-overview?token=socket-token',
			makeEnv(),
			null
		)
		expect(res.status).toBe(401)
		expect(getClaims).not.toHaveBeenCalled()
	})
})

describe('/api/public', () => {
	const open = createApi()
	open.get('/public/ping', (c) => c.text('pong'))
	open.get('/crew/ping', (c) => c.text('pong'))

	it('answers a public route without a token', async () => {
		const res = await open.request('/api/public/ping', {}, makeEnv())
		expect(res.status).toBe(200)
		expect(getClaims).not.toHaveBeenCalled()
	})

	it('still needs the admin everywhere else', async () => {
		expect((await open.request('/api/crew/ping', {}, makeEnv())).status).toBe(
			401
		)
		expect(
			(await open.request('/api/public/../crew/ping', {}, makeEnv())).status
		).toBe(401)
		expect((await open.request('/api/publicity', {}, makeEnv())).status).toBe(
			401
		)
	})
})

describe('/api/voice', () => {
	const run = vi.fn()
	const voiceEnv = () => ({ ...makeEnv(), AI: { run } }) as unknown as Env
	const post = (path: string, body: BodyInit, contentType: string) =>
		app.request(
			path,
			{
				method: 'POST',
				body,
				headers: {
					authorization: 'Bearer user-token',
					'content-type': contentType,
				},
			},
			voiceEnv()
		)

	beforeEach(() => run.mockReset())

	it('needs an admin, like every route', async () => {
		const res = await app.request(
			'/api/voice/transcribe',
			{ method: 'POST', body: 'x' },
			voiceEnv()
		)
		expect(res.status).toBe(401)
		expect(run).not.toHaveBeenCalled()
	})

	it('transcribes a recording with nova-3, without the codecs parameter', async () => {
		run.mockResolvedValue({
			results: {
				channels: [{ alternatives: [{ transcript: 'Hey, sitrep?' }] }],
			},
		})
		const res = await post(
			'/api/voice/transcribe',
			new Uint8Array([1, 2, 3]),
			'audio/webm;codecs=opus'
		)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({ text: 'Hey, sitrep?' })
		expect(run.mock.calls[0][0]).toBe('@cf/deepgram/nova-3')
		expect(run.mock.calls[0][1]).toMatchObject({
			audio: { contentType: 'audio/webm' },
			smart_format: true,
		})
	})

	it('refuses a body that is not audio', async () => {
		const res = await post('/api/voice/transcribe', '{}', 'application/json')
		expect(res.status).toBe(400)
		expect(run).not.toHaveBeenCalled()
	})

	it('speaks in the agent’s own voice, as MP3', async () => {
		run.mockResolvedValue(new Response(new Uint8Array([9, 9])))
		const res = await post(
			'/api/voice/speak',
			JSON.stringify({ text: 'Aye, captain.', agent: 'command-1' }),
			'application/json'
		)
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('audio/mpeg')
		expect(run.mock.calls[0][0]).toBe('@cf/deepgram/aura-2-en')
		expect(run.mock.calls[0][1]).toMatchObject({
			text: 'Aye, captain.',
			speaker: 'orion',
			encoding: 'mp3',
		})
	})

	it('refuses a speaker who is not on the crew', async () => {
		const res = await post(
			'/api/voice/speak',
			JSON.stringify({ text: 'Hello', agent: 'worf' }),
			'application/json'
		)
		expect(res.status).toBe(400)
		expect(run).not.toHaveBeenCalled()
	})
})
