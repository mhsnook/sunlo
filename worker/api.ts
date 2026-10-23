import { Hono } from 'hono'
import { ExtractRequestSchema, extractPhrases } from './extract-phrase'
import { supabaseFor } from './supabase'

type AppEnv = { Bindings: Env; Variables: { uid: string } }

// The web app calls these routes from its own origin, so they need no CORS.
const app = new Hono<AppEnv>().basePath('/api')

// Every route needs a signed-in Sunlo user. The anon key is a valid JWT
// too, so check the role claim, not only the signature.
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
	c.set('uid', claims.sub)
	return next()
})

app.post('/extract-phrase', async (c) => {
	const { success } = await c.env.EXTRACT_LIMITER.limit({ key: c.get('uid') })
	if (!success) {
		return c.json({ error: 'Too many photos at once. Wait a minute.' }, 429)
	}

	const parsed = ExtractRequestSchema.safeParse(
		await c.req.json().catch(() => null)
	)
	if (!parsed.success) {
		return c.json({ error: 'Send one PNG, JPEG or WebP image under 4 MB' }, 400)
	}

	try {
		const phrases = await extractPhrases(
			c.env.AI,
			c.env.PHOTO_EXTRACT_MODEL,
			parsed.data
		)
		return c.json({ phrases })
	} catch (err) {
		console.error('extract-phrase failed', err)
		return c.json({ error: "Couldn't read this photo. Try again." }, 502)
	}
})

export default app
