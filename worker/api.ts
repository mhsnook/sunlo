import { Hono } from 'hono'
import { requireUser, type AppEnv } from './auth'
import { ExtractRequestSchema, extractPhrases } from './extract-phrase'

// The web app calls these routes from its own origin, so they need no CORS.
const app = new Hono<AppEnv>().basePath('/api')

app.use('*', requireUser)

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
		const phrases = await extractPhrases(c.env, parsed.data)
		return c.json({ phrases })
	} catch (err) {
		console.error('extract-phrase failed', err)
		return c.json({ error: "Couldn't read this photo. Try again." }, 502)
	}
})

export default app
