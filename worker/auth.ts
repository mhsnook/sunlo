import type { MiddlewareHandler } from 'hono'
import { supabaseFor } from './supabase'

export type AppEnv = { Bindings: Env; Variables: { uid: string } }

/**
 * The signed-in user's id, or undefined for no token, a token that fails
 * verification, or the anon key. The anon key is a valid JWT too, so this
 * checks the role claim, not only the signature.
 */
export async function signedInUid(
	env: Env,
	authorization: string | undefined
): Promise<string | undefined> {
	const token = authorization?.replace(/^Bearer\s+/i, '')
	if (!token) return undefined
	// getClaims() throws, rather than returning `error`, on some malformed
	// tokens (e.g. no `exp` claim).
	const claims = await supabaseFor(env)
		.auth.getClaims(token)
		.then(({ data }) => data?.claims)
		.catch(() => undefined)
	return claims?.role === 'authenticated' ? claims.sub : undefined
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
	const uid = await signedInUid(c.env, c.req.header('authorization'))
	if (!uid) return c.json({ error: 'Sign in to use this' }, 401)
	c.set('uid', uid)
	return next()
}
