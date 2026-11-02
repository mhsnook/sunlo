import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import type { AppEnv } from './auth'
import { COACH_MOUNT } from '../src/features/coach/protocol'
import { requireOwnConversation } from './coach-access'

const UID = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
const OTHER = 'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8'

function makeApp(limitOk = true) {
	const limit = vi.fn().mockResolvedValue({ success: limitOk })
	const app = new Hono<AppEnv>()
	app.use('*', async (c, next) => {
		c.set('uid', UID)
		return next()
	})
	app.use(`${COACH_MOUNT}/*`, requireOwnConversation)
	app.all(`${COACH_MOUNT}/*`, (c) => c.text('agent'))
	const env = { COACH_LIMITER: { limit } } as unknown as Env
	return {
		limit,
		request: (path: string, method = 'GET') =>
			app.request(`${COACH_MOUNT}/${path}`, { method }, env),
	}
}

describe('requireOwnConversation', () => {
	it('lets a learner read their own conversation', async () => {
		const res = await makeApp().request(`kan-${UID}.t1`)
		expect(res.status).toBe(200)
	})

	it("refuses another learner's conversation", async () => {
		const res = await makeApp().request(`kan-${OTHER}.t1`, 'POST')
		expect(res.status).toBe(403)
	})

	it('refuses an id it cannot parse', async () => {
		const res = await makeApp().request(`${UID}`)
		expect(res.status).toBe(403)
	})

	it('counts messages against the limit, and answers 429 over it', async () => {
		const { request, limit } = makeApp(false)
		const res = await request(`kan-${UID}.t1`, 'POST')
		expect(res.status).toBe(429)
		expect(limit).toHaveBeenCalledWith({ key: UID })
	})

	it('does not count an abort', async () => {
		const { request, limit } = makeApp(false)
		const res = await request(`kan-${UID}.t1/abort`, 'POST')
		expect(res.status).toBe(200)
		expect(limit).not.toHaveBeenCalled()
	})
})
