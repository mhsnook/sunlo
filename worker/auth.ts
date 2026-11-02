import type { MiddlewareHandler } from 'hono'
import { supabaseFor } from './supabase'

export type AppEnv = { Bindings: Env; Variables: { uid: string } }

// Needs a signed-in Sunlo user. The anon key is a valid JWT too, so it
// checks the role claim, not only the signature.
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
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
	c.set('uid', claims.sub)
	return next()
}
