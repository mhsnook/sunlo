import { Hono } from 'hono'
import { requireUser, signedInUid, type AppEnv } from './auth'
import { ExtractRequestSchema, extractPhrases } from './extract-phrase'
import { SearchRequestSchema, embedderFor, searchCorpus } from './search'
import { supabaseFor } from './supabase'

// The web app calls these routes from its own origin, so they need no CORS.
const app = new Hono<AppEnv>().basePath('/api')

app.post('/extract-phrase', requireUser, async (c) => {
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

// No requireUser: the search page works signed out, as the _user layout
// does, so a visitor's searches are limited by IP instead.
app.post('/search', async (c) => {
	const uid = await signedInUid(c.env, c.req.header('authorization'))
	const key = uid ?? `ip:${c.req.header('cf-connecting-ip') ?? 'unknown'}`
	const { success } = await c.env.SEARCH_LIMITER.limit({ key })
	if (!success) {
		return c.json({ error: 'Too many searches at once. Wait a minute.' }, 429)
	}

	const parsed = SearchRequestSchema.safeParse(
		await c.req.json().catch(() => null)
	)
	if (!parsed.success) return c.json({ error: 'Invalid search request' }, 400)

	try {
		const results = await searchCorpus(
			supabaseFor(c.env),
			embedderFor(c.env),
			parsed.data
		)
		return c.json(results)
	} catch (err) {
		console.error('search failed', err)
		return c.json({ error: "Couldn't search right now. Try again." }, 500)
	}
})

export default app
