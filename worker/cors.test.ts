import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { NATIVE_APP_ORIGINS, nativeAppCors } from './cors'

// Mirrors .flue/app.ts: the middleware sits in front of a route that would
// reject a request with no token.
const app = new Hono()
app.use('/api/*', nativeAppCors)
app.post('/api/search', (c) =>
	c.req.header('authorization')
		? c.json({ ok: true })
		: c.json({ error: 'no token' }, 401)
)

function preflight(origin: string) {
	return app.request('/api/search', {
		method: 'OPTIONS',
		headers: {
			origin,
			'access-control-request-method': 'POST',
			'access-control-request-headers': 'authorization, content-type',
		},
	})
}

describe('native app CORS', () => {
	it.each(NATIVE_APP_ORIGINS)(
		'answers a preflight from %s without a token',
		async (origin) => {
			const res = await preflight(origin)
			expect(res.status).toBe(204)
			expect(res.headers.get('access-control-allow-origin')).toBe(origin)
			expect(res.headers.get('access-control-allow-headers')).toBe(
				'authorization,content-type'
			)
		}
	)

	it('allows the response to a native request', async () => {
		const res = await app.request('/api/search', {
			method: 'POST',
			headers: { origin: 'capacitor://localhost', authorization: 'Bearer t' },
		})
		expect(res.status).toBe(200)
		expect(res.headers.get('access-control-allow-origin')).toBe(
			'capacitor://localhost'
		)
		expect(res.headers.get('access-control-expose-headers')).toBe(
			'flue-error-ref'
		)
	})

	it('allows no other origin', async () => {
		const res = await preflight('https://example.com')
		expect(res.headers.get('access-control-allow-origin')).toBeNull()
	})
})
