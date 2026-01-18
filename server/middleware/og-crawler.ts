/**
 * Open Graph Crawler Middleware
 *
 * This middleware intercepts requests from social media crawlers and returns
 * a minimal HTML page with Open Graph meta tags for link previews.
 *
 * The app is a pure SPA (no SSR), so this edge middleware runs separately
 * to serve OG tags to crawlers while the main app remains client-side only.
 *
 * DEPLOYMENT OPTIONS:
 *
 * 1. Cloudflare Pages Functions - Place in functions/_middleware.ts
 * 2. Vercel Edge Middleware - Place in middleware.ts at project root
 * 3. Netlify Edge Functions - Place in netlify/edge-functions/
 *
 * The implementation below uses standard Web APIs (Request/Response)
 * and can be adapted for any edge runtime.
 */

import { createClient } from '@supabase/supabase-js'

// Social media crawler User-Agent patterns
const CRAWLER_PATTERNS = [
	'facebookexternalhit',
	'Facebot',
	'Instagram',
	'Twitterbot',
	'LinkedInBot',
	'WhatsApp',
	'Signal',
	'Slackbot',
	'TelegramBot',
	'Discordbot',
	'Pinterest',
	'Googlebot',
	'bingbot',
	'Applebot',
]

function isCrawler(userAgent: string | null): boolean {
	if (!userAgent) return false
	return CRAWLER_PATTERNS.some((pattern) =>
		userAgent.toLowerCase().includes(pattern.toLowerCase())
	)
}

// Route patterns for content that needs Open Graph tags
const OG_ROUTES = [
	{ pattern: /^\/learn\/([a-z]{3})\/phrases\/([a-f0-9-]+)$/, type: 'phrase' },
	{
		pattern: /^\/learn\/([a-z]{3})\/playlists\/([a-f0-9-]+)$/,
		type: 'playlist',
	},
	{
		pattern: /^\/learn\/([a-z]{3})\/requests\/([a-f0-9-]+)$/,
		type: 'request',
	},
] as const

interface OGData {
	title: string
	description: string
	image?: string
	url: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOGData(
	path: string,
	supabase: any
): Promise<OGData | null> {
	for (const route of OG_ROUTES) {
		const match = path.match(route.pattern)
		if (!match) continue

		const [, lang, id] = match

		try {
			if (route.type === 'phrase') {
				const { data } = await supabase
					.from('phrase_meta')
					.select('text, translations:phrase_translation(text, lang)')
					.eq('id', id)
					.single()

				if (data) {
					const translation = data.translations?.[0]?.text || ''
					return {
						title: `Learn "${data.text}" in ${lang.toUpperCase()}`,
						description: translation || data.text,
						url: path,
					}
				}
			}

			if (route.type === 'playlist') {
				const { data } = await supabase
					.from('phrase_playlist')
					.select('title, description')
					.eq('id', id)
					.single()

				if (data) {
					return {
						title: data.title,
						description:
							data.description ||
							`A ${lang.toUpperCase()} learning playlist on Sunlo`,
						url: path,
					}
				}
			}

			if (route.type === 'request') {
				const { data } = await supabase
					.from('phrase_request')
					.select('prompt')
					.eq('id', id)
					.single()

				if (data) {
					return {
						title: `Translation Request: ${data.prompt.slice(0, 60)}${data.prompt.length > 60 ? '...' : ''}`,
						description: data.prompt,
						url: path,
					}
				}
			}
		} catch (e) {
			console.error('Error fetching OG data:', e)
		}
	}

	return null
}

function generateOGHtml(data: OGData, baseUrl: string): string {
	const fullUrl = `${baseUrl}${data.url}`
	const siteName = 'Sunlo'
	const defaultImage = `${baseUrl}/images/og-default.png`

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.title)} | ${siteName}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:title" content="${escapeHtml(data.title)}">
  <meta property="og:description" content="${escapeHtml(data.description)}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:image" content="${data.image || defaultImage}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(data.title)}">
  <meta name="twitter:description" content="${escapeHtml(data.description)}">
  <meta name="twitter:image" content="${data.image || defaultImage}">

  <!-- Redirect non-crawlers to the SPA -->
  <meta http-equiv="refresh" content="0;url=${fullUrl}">
</head>
<body>
  <h1>${escapeHtml(data.title)}</h1>
  <p>${escapeHtml(data.description)}</p>
  <a href="${fullUrl}">View on ${siteName}</a>
</body>
</html>`
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
}

/**
 * Edge middleware handler
 * Adapt this for your deployment platform (Cloudflare, Vercel, Netlify)
 */
export async function handleRequest(
	request: Request,
	env: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string }
): Promise<Response | null> {
	const userAgent = request.headers.get('user-agent')
	const url = new URL(request.url)
	const path = url.pathname

	// Only intercept for crawlers on routes that need OG tags
	if (!isCrawler(userAgent)) return null
	if (!OG_ROUTES.some((route) => route.pattern.test(path))) return null

	const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
	const ogData = await fetchOGData(path, supabase)

	if (!ogData) return null

	const baseUrl = `${url.protocol}//${url.host}`
	const html = generateOGHtml(ogData, baseUrl)

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	})
}
