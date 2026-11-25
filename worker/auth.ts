import type { MiddlewareHandler } from 'hono'
import { supabaseFor } from './supabase'

export type AppEnv = {
	Bindings: Env
	Variables: { uid: string; anonymous: boolean }
}

type SignedInUser = { uid: string; anonymous: boolean }

/**
 * The signed-in user, or undefined for no token, a token that fails
 * verification, or the anon key. The anon key is a valid JWT too, so this
 * checks the role claim, not only the signature. A visitor who signed in
 * anonymously has the "authenticated" role too, and `anonymous` set.
 */
export async function signedInUser(
	env: Env,
	authorization: string | undefined
): Promise<SignedInUser | undefined> {
	const token = authorization?.replace(/^Bearer\s+/i, '')
	if (!token) return undefined
	// getClaims() throws, rather than returning `error`, on some malformed
	// tokens (e.g. no `exp` claim).
	const claims = await supabaseFor(env)
		.auth.getClaims(token)
		.then(({ data }) => data?.claims)
		.catch(() => undefined)
	return claims?.role === 'authenticated'
		? { uid: claims.sub, anonymous: claims.is_anonymous === true }
		: undefined
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
	const user = await signedInUser(c.env, c.req.header('authorization'))
	if (!user) return c.json({ error: 'Sign in to use this' }, 401)
	c.set('uid', user.uid)
	c.set('anonymous', user.anonymous)
	return next()
}
