import { getAgentByName } from 'agents'
import { Hono } from 'hono'
import type { Sql } from 'postgres'
import { z } from 'zod'
import { connect, withDeadline } from './db'
import { activityOverview, userActivity } from './stats'
import { supabaseFor } from './supabase'

type AppEnv = {
	Bindings: Env
	Variables: { sql: Sql; admin: { uid: string; email: string } }
}

// The admin app calls these routes from its own origin, so they need no CORS.
const app = new Hono<AppEnv>().basePath('/api')

app.onError((err, c) => {
	console.error('admin api failed', err)
	return c.json({ error: 'The database query failed' }, 500)
})

// Every route needs a signed-in Sunlo user who is in admin_user. The anon
// key is a valid JWT too, so check the role claim, not only the signature.
app.use('*', async (c, next) => {
	const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '')
	if (!token) return c.json({ error: 'Sign in to use this' }, 401)
	// getClaims() throws, rather than returning `error`, on some malformed
	// tokens (e.g. no `exp` claim).
	const claims = await supabaseFor(c.env)
		.auth.getClaims(token)
		.then(({ data }) => data?.claims)
		.catch(() => undefined)
	if (claims?.role !== 'authenticated') {
		return c.json({ error: 'Sign in to use this' }, 401)
	}

	const sql = connect(c.env.HYPERDRIVE)
	try {
		const [{ is_admin }] = await withDeadline(
			sql<[{ is_admin: boolean }]>`
				select exists (
					select 1 from public.admin_user where uid = ${claims.sub}
				) as is_admin`,
			15_000,
			'The database'
		)
		if (!is_admin) {
			return c.json({ error: 'This account is not an admin' }, 403)
		}
		c.set('sql', sql)
		c.set('admin', { uid: claims.sub, email: claims.email ?? claims.sub })
		await next()
	} finally {
		await sql.end({ timeout: 5 })
	}
})

const DaysSchema = z.coerce.number().int().min(1).max(90)
const LimitSchema = z.coerce.number().int().min(1).max(200)

app.get('/activity-overview', async (c) => {
	const days = DaysSchema.safeParse(c.req.query('days') ?? 7)
	if (!days.success) {
		return c.json({ error: 'days must be a whole number from 1 to 90' }, 400)
	}
	return c.json(await activityOverview(c.get('sql'), days.data))
})

app.get('/user-activity', async (c) => {
	const days = DaysSchema.safeParse(c.req.query('days') ?? 7)
	if (!days.success) {
		return c.json({ error: 'days must be a whole number from 1 to 90' }, 400)
	}
	const limit = LimitSchema.safeParse(c.req.query('limit') ?? 20)
	if (!limit.success) {
		return c.json({ error: 'limit must be a whole number from 1 to 200' }, 400)
	}
	return c.json(await userActivity(c.get('sql'), days.data, limit.data))
})

const reporterFor = (env: Env) => getAgentByName(env.REPORTER, 'team')

app.post('/reporter/check-in', async (c) => {
	const reporter = await reporterFor(c.env)
	const fresh = c.req.query('fresh') === '1'
	return c.json(await reporter.checkIn(c.get('admin'), { fresh }))
})

app.get('/reporter/reports/:id', async (c) => {
	const reporter = await reporterFor(c.env)
	const report = await reporter.getReport(c.req.param('id'), c.get('admin').uid)
	if (!report) return c.json({ error: 'No report with that id' }, 404)
	return c.json(report)
})

app.get('/reporter/notes', async (c) => {
	const reporter = await reporterFor(c.env)
	return c.json(await reporter.listNotes())
})

app.delete('/reporter/notes/:id', async (c) => {
	const id = z.coerce.number().int().safeParse(c.req.param('id'))
	if (!id.success) return c.json({ error: 'Note ids are whole numbers' }, 400)
	const reporter = await reporterFor(c.env)
	await reporter.forgetNote(id.data)
	return c.json({ ok: true })
})

export default app
