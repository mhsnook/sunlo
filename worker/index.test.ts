import { describe, expect, it, vi } from 'vitest'

const single = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
	createClient: () => ({
		auth: { getClaims: vi.fn() },
		from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
	}),
}))

const { default: worker } = await import('./index')

const PHRASE_PATH = '/learn/hin/phrases/0b8e7c1a-0000-4000-8000-000000000001'
const CRAWLER_UA = 'facebookexternalhit/1.1'
const BROWSER_UA = 'Mozilla/5.0 (Macintosh) Safari/605.1.15'

function makeEnv() {
	const assets = vi.fn(() => Promise.resolve(new Response('<app shell>')))
	const env = {
		SUPABASE_URL: 'http://supabase.test',
		SUPABASE_ANON_KEY: 'anon',
		ASSETS: { fetch: assets },
	}
	return { env: env as unknown as Env, assets }
}

function get(env: Env, path: string, userAgent: string) {
	return worker.fetch(
		new Request(`https://sunlo.app${path}`, {
			headers: { 'user-agent': userAgent },
		}),
		env,
		{} as ExecutionContext
	)
}

describe('worker routing', () => {
	it('serves the app to a browser on a /learn page', async () => {
		const { env, assets } = makeEnv()
		const res = await get(env, PHRASE_PATH, BROWSER_UA)
		expect(await res.text()).toBe('<app shell>')
		expect(assets).toHaveBeenCalledOnce()
		expect(single).not.toHaveBeenCalled()
	})

	it('serves Open Graph tags to a crawler on a phrase page', async () => {
		single.mockResolvedValueOnce({
			data: { text: 'नमस्ते', translations: [{ text: 'Hello', lang: 'eng' }] },
		})
		const { env, assets } = makeEnv()
		const html = await (await get(env, PHRASE_PATH, CRAWLER_UA)).text()
		expect(html).toContain('<meta property="og:description" content="Hello">')
		expect(html).toContain('in Hindi')
		expect(assets).not.toHaveBeenCalled()
	})

	it('serves the app to a crawler when the phrase is not found', async () => {
		single.mockResolvedValueOnce({ data: null })
		const { env, assets } = makeEnv()
		await get(env, PHRASE_PATH, CRAWLER_UA)
		expect(assets).toHaveBeenCalledOnce()
	})

	it('sends /api requests to the API, not to the static files', async () => {
		const { env, assets } = makeEnv()
		const res = await worker.fetch(
			new Request('https://sunlo.app/api/extract-phrase', { method: 'POST' }),
			env,
			{} as ExecutionContext
		)
		expect(res.status).toBe(401)
		expect(assets).not.toHaveBeenCalled()
	})
})
