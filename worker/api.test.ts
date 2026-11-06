import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClaims = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({ auth: { getClaims } }),
}))

const searchCorpus = vi.fn<typeof import('./search').searchCorpus>()
vi.mock('./search', async (importOriginal) => ({
	...(await importOriginal<typeof import('./search')>()),
	searchCorpus: (...args: Parameters<typeof searchCorpus>) =>
		searchCorpus(...args),
}))

const { default: app } = await import('./api')

const IMAGE = 'data:image/jpeg;base64,AAAA'
const BODY = {
	image: IMAGE,
	lang: 'hin',
	langName: 'Hindi',
	translationLang: 'eng',
	translationLangName: 'English',
}

type RunFn = (
	model: string,
	input: { messages: Array<{ content: Array<unknown> }> },
	options?: { gateway?: { id: string } }
) => Promise<unknown>

function makeEnv(overrides: { limitOk?: boolean; content?: unknown } = {}) {
	const searchLimit = vi
		.fn()
		.mockResolvedValue({ success: overrides.limitOk ?? true })
	const run = vi.fn<RunFn>().mockResolvedValue({
		choices: [{ message: { content: overrides.content ?? '{"phrases":[]}' } }],
	})
	const env = {
		PHOTO_EXTRACT_MODEL: '@cf/google/gemma-4-26b-a4b-it',
		AI_GATEWAY_ID: 'sunlo-app',
		SUPABASE_URL: 'http://supabase.test',
		SUPABASE_ANON_KEY: 'anon',
		AI: { run },
		EXTRACT_LIMITER: {
			limit: vi.fn().mockResolvedValue({ success: overrides.limitOk ?? true }),
		},
		SEARCH_LIMITER: { limit: searchLimit },
	}
	return { env: env as unknown as Env, run, searchLimit }
}

function post(
	env: Env,
	body: unknown = BODY,
	token = 'user-token',
	path = '/api/extract-phrase'
) {
	return app.request(
		path,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(body),
		},
		env
	)
}

beforeEach(() => {
	searchCorpus.mockReset()
	getClaims.mockReset()
	getClaims.mockResolvedValue({
		data: { claims: { role: 'authenticated', sub: 'user-1' } },
		error: null,
	})
})

describe('auth', () => {
	it('rejects a request with no token', async () => {
		const { env } = makeEnv()
		const res = await app.request(
			'/api/extract-phrase',
			{ method: 'POST', body: JSON.stringify(BODY) },
			env
		)
		expect(res.status).toBe(401)
	})

	it('rejects the anon key', async () => {
		getClaims.mockResolvedValue({
			data: { claims: { role: 'anon' } },
			error: null,
		})
		const { env, run } = makeEnv()
		const res = await post(env)
		expect(res.status).toBe(401)
		expect(run).not.toHaveBeenCalled()
	})

	it('rejects a token that makes verification throw', async () => {
		getClaims.mockRejectedValue(new Error('Missing exp claim'))
		const { env } = makeEnv()
		expect((await post(env)).status).toBe(401)
	})

	it('rejects a token that fails verification', async () => {
		getClaims.mockResolvedValue({ data: null, error: new Error('bad sig') })
		const { env } = makeEnv()
		expect((await post(env)).status).toBe(401)
	})
})

describe('POST /extract-phrase', () => {
	it('returns 429 when the user is over the rate limit', async () => {
		const { env, run } = makeEnv({ limitOk: false })
		const res = await post(env)
		expect(res.status).toBe(429)
		expect(run).not.toHaveBeenCalled()
	})

	it('rejects a body that is not an image data URL', async () => {
		const { env } = makeEnv()
		const res = await post(env, { ...BODY, image: 'https://example.com/a.jpg' })
		expect(res.status).toBe(400)
	})

	it('sends the image to the model and returns cleaned phrases', async () => {
		const { env, run } = makeEnv({
			content:
				'```json\n{"phrases":[{"text":" नमस्ते ","lang":"hin","transliteration":"namaste","translation":"Hello"},{"text":"नमस्ते","lang":"hin","transliteration":null,"translation":null}]}\n```',
		})
		const res = await post(env)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual({
			phrases: [
				{
					text: 'नमस्ते',
					lang: 'hin',
					transliteration: 'namaste',
					translation: 'Hello',
				},
			],
		})
		const [model, input, options] = run.mock.calls[0]
		expect(model).toBe('@cf/google/gemma-4-26b-a4b-it')
		expect(options).toEqual({ gateway: { id: 'sunlo-app' } })
		expect(input.messages[0].content[1]).toEqual({
			type: 'image_url',
			image_url: { url: IMAGE },
		})
	})

	it('returns 502 when the model answer is not JSON', async () => {
		const { env } = makeEnv({ content: 'I see a sign.' })
		expect((await post(env)).status).toBe(502)
	})
})

describe('POST /search', () => {
	const SEARCH = {
		langs: ['hin'],
		query: { kind: 'text', text: 'namaste' },
		excludeIds: [],
		limit: 20,
	}
	const search = (env: Env, body: unknown = SEARCH) =>
		post(env, body, 'user-token', '/api/search')

	it('returns 429 when the user is over the rate limit', async () => {
		const { env } = makeEnv({ limitOk: false })
		expect((await search(env)).status).toBe(429)
		expect(searchCorpus).not.toHaveBeenCalled()
	})

	it('limits a signed-in user by their id', async () => {
		searchCorpus.mockResolvedValue([])
		const { env, searchLimit } = makeEnv()
		expect((await search(env)).status).toBe(200)
		expect(searchLimit).toHaveBeenCalledWith({ key: 'user-1' })
	})

	it('serves a signed-out visitor and limits them by IP', async () => {
		searchCorpus.mockResolvedValue([])
		const { env, searchLimit } = makeEnv()
		const res = await app.request(
			'/api/search',
			{
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'cf-connecting-ip': '203.0.113.7',
				},
				body: JSON.stringify(SEARCH),
			},
			env
		)
		expect(res.status).toBe(200)
		expect(getClaims).not.toHaveBeenCalled()
		expect(searchLimit).toHaveBeenCalledWith({ key: 'ip:203.0.113.7' })
	})

	it('treats the anon key as signed out', async () => {
		searchCorpus.mockResolvedValue([])
		getClaims.mockResolvedValue({
			data: { claims: { role: 'anon' } },
			error: null,
		})
		const { env, searchLimit } = makeEnv()
		expect((await search(env)).status).toBe(200)
		expect(searchLimit).toHaveBeenCalledWith({ key: 'ip:unknown' })
	})

	it('rejects a body that is not a search request', async () => {
		const { env } = makeEnv()
		const res = await search(env, { ...SEARCH, query: { kind: 'regex' } })
		expect(res.status).toBe(400)
		expect(searchCorpus).not.toHaveBeenCalled()
	})

	it('returns the ranked results', async () => {
		const results = [
			{
				entity_type: 'phrase' as const,
				entity_id: 'p1',
				lang: 'hin',
				text: 'नमस्ते',
				score: 0.9,
				translations: [],
			},
		]
		searchCorpus.mockResolvedValue(results)
		const { env } = makeEnv()
		const res = await search(env)
		expect(res.status).toBe(200)
		expect(await res.json()).toEqual(results)
		expect(searchCorpus.mock.calls[0][2]).toEqual(SEARCH)
	})

	it('returns 500 when the search fails', async () => {
		searchCorpus.mockRejectedValue(new Error('rpc failed'))
		vi.spyOn(console, 'error').mockImplementation(() => {})
		const { env } = makeEnv()
		expect((await search(env)).status).toBe(500)
	})
})
