import { Hono } from 'hono'
import type { Sql } from 'postgres'
import { z } from 'zod'
import { connect, withDeadline } from './db'
import { activityOverview, userActivity } from './stats'
import { supabaseFor } from './supabase'

export type AppEnv = {
	Bindings: Env
	Variables: {
		sql: Sql
		// `name` is the admin's username, or their email when they have none.
		admin: { uid: string; email: string; name: string }
	}
}

const DaysSchema = z.coerce.number().int().min(1).max(90)
const LimitSchema = z.coerce.number().int().min(1).max(200)

// A fresh app per call: .flue/app.ts adds the crew and agent routes to it,
// and Hono refuses new routes on an app that has served a request, which a
// cached module would have done by the time Vite reloads app.ts in dev.
export function createApi() {
	// The admin app calls these routes from its own origin, so they need no CORS.
	const app = new Hono<AppEnv>().basePath('/api')

	app.onError((err, c) => {
		console.error('admin api failed', err)
		return c.json({ error: 'The database query failed' }, 500)
	})

	// Every route needs a signed-in Sunlo user who is in admin_user. The anon
	// key is a valid JWT too, so check the role claim, not only the signature.
	app.use('*', async (c, next) => {
		// Browsers cannot set headers on a WebSocket, so the crew room's socket
		// (/api/crew/live, opened by useAgent) sends the token as ?token=.
		const token =
			c.req.header('authorization')?.replace(/^Bearer\s+/i, '') ??
			(c.req.path === '/api/crew/live' ? c.req.query('token') : undefined)
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
			const [{ is_admin, username }] = await withDeadline(
				sql<[{ is_admin: boolean; username: string | null }]>`
					select
						exists (
							select 1 from public.admin_user where uid = ${claims.sub}
						) as is_admin,
						(select username from public.user_profile where uid = ${claims.sub}) as username`,
				15_000,
				'The database'
			)
			if (!is_admin) {
				return c.json({ error: 'This account is not an admin' }, 403)
			}
			c.set('sql', sql)
			const email = claims.email ?? claims.sub
			c.set('admin', { uid: claims.sub, email, name: username ?? email })
			await next()
		} finally {
			await sql.end({ timeout: 5 })
		}
	})

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
			return c.json(
				{ error: 'limit must be a whole number from 1 to 200' },
				400
			)
		}
		return c.json(await userActivity(c.get('sql'), days.data, limit.data))
	})

	return app
}
