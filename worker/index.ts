import api from './api'
import { crawlerPreview } from './og'
import { supabaseFor } from './supabase'

// One worker serves the web app's static files and /api, so every
// deployed version carries an app and an API from the same commit.
// It only runs for the paths in wrangler.jsonc `run_worker_first`.
export default {
	async fetch(request, env, ctx) {
		const { pathname } = new URL(request.url)
		if (pathname === '/api' || pathname.startsWith('/api/')) {
			return api.fetch(request, env, ctx)
		}
		const preview = await crawlerPreview(
			request,
			() => supabaseFor(env),
			env.SUPABASE_URL
		)
		return preview ?? env.ASSETS.fetch(request)
	},
} satisfies ExportedHandler<Env>
