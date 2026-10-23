import api from './api'

// One worker serves the admin app's static files and /api. It only runs
// for the paths in wrangler.jsonc `run_worker_first`.
export default {
	fetch(request, env, ctx) {
		const { pathname } = new URL(request.url)
		if (pathname === '/api' || pathname.startsWith('/api/')) {
			return api.fetch(request, env, ctx)
		}
		return env.ASSETS.fetch(request)
	},
} satisfies ExportedHandler<Env>
