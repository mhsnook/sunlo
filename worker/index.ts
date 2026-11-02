import { Hono } from 'hono'
import api from './api'
import type { AppEnv } from './auth'
import { crawlerPreview } from './og'
import { supabaseFor } from './supabase'

// The app's own routes. .flue/app.ts is the Worker's entry: it mounts the
// agents, then this. The Worker only runs for the paths in wrangler.jsonc
// `run_worker_first`; every other request is a static file.
const app = new Hono<AppEnv>()

app.route('/', api)

app.all('*', async (c) => {
	const preview = await crawlerPreview(
		c.req.raw,
		() => supabaseFor(c.env),
		c.env.SUPABASE_URL
	)
	return preview ?? c.env.ASSETS.fetch(c.req.raw)
})

export default app
