/**
 * Vercel Edge Middleware: Open Graph tags for social crawlers.
 *
 * The Cloudflare worker (worker/index.ts) runs the same crawlerPreview().
 * Delete this file when sunlo.app moves off Vercel.
 */

import { createClient } from '@supabase/supabase-js'
import { crawlerPreview } from './worker/og'

export const config = {
	matcher: [
		'/learn/:lang',
		'/learn/:lang/feed',
		'/learn/:lang/phrases/:id*',
		'/learn/:lang/playlists/:id*',
		'/learn/:lang/requests/:id*',
	],
}

export default async function middleware(request: Request) {
	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		console.error('Missing Supabase environment variables')
		return
	}

	const preview = await crawlerPreview(
		request,
		() => createClient(supabaseUrl, supabaseAnonKey),
		supabaseUrl
	)
	return preview ?? undefined
}
