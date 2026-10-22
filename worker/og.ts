// oxlint-disable no-await-in-loop
/**
 * Open Graph previews for social crawlers.
 *
 * The app is a pure SPA, so a crawler that fetches a shared link sees an
 * empty page. For a crawler on one of OG_ROUTES, crawlerPreview() returns
 * a minimal HTML page with Open Graph tags; for anyone else it returns
 * null and the caller serves the app.
 *
 * Supported platforms: Facebook, Instagram, Twitter/X, LinkedIn, WhatsApp,
 * Signal, Slack, Telegram, Discord, Pinterest, and search engines.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/supabase'
import languages from '../src/lib/languages'

function getLanguageName(code: string): string {
	return languages[code] || code.toUpperCase()
}

// Social media crawler User-Agent patterns
// Includes Signal, Instagram, and other major platforms
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
	{ pattern: /^\/learn\/([a-z]{3})(\/feed)?$/, type: 'language' },
] as const

interface OGData {
	title: string
	description: string
	image?: string
	url: string
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
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

async function fetchOGData(
	path: string,
	supabase: SupabaseClient<Database>,
	supabaseUrl: string
): Promise<OGData | null> {
	for (const route of OG_ROUTES) {
		const match = path.match(route.pattern)
		if (!match) continue

		const [, lang, id] = match
		const langName = getLanguageName(lang)

		try {
			if (route.type === 'phrase') {
				const { data } = await supabase
					.from('phrase')
					.select('text, translations:phrase_translation(text, lang)')
					.eq('id', id)
					.single()

				if (data) {
					const translation = data.translations?.[0]?.text || ''
					return {
						title: `Learn "${data.text}" in ${langName}`,
						description: translation || data.text,
						url: path,
					}
				}
			}

			if (route.type === 'playlist') {
				const { data } = await supabase
					.from('phrase_playlist')
					.select('title, description, cover_image_path')
					.eq('id', id)
					.single()

				if (data) {
					// Construct cover image URL from Supabase storage
					const imageUrl = data.cover_image_path
						? `${supabaseUrl}/storage/v1/object/public/avatars/${data.cover_image_path}`
						: undefined

					return {
						title: `${data.title} - ${langName} Playlist`,
						description:
							data.description || `A ${langName} learning playlist on Sunlo`,
						image: imageUrl,
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
						title: `${langName} Translation Request`,
						description: data.prompt,
						url: path,
					}
				}
			}

			if (route.type === 'language') {
				// Count learners for this language
				const { count } = await supabase
					.from('user_deck')
					.select('*', { count: 'exact', head: true })
					.eq('lang', lang)

				const learnerCount = count || 0
				const learnerText =
					learnerCount === 0
						? 'Start learning'
						: learnerCount === 1
							? 'Join 1 learner'
							: `Join ${learnerCount} learners`

				return {
					title: `Learn ${langName} on Sunlo`,
					description: `${learnerText} studying ${langName} with community-created phrases and spaced repetition.`,
					url: path,
				}
			}
		} catch (e) {
			console.error('Error fetching OG data:', e)
		}
	}

	return null
}

// Takes a client getter, so a request from a browser never builds a client.
export async function crawlerPreview(
	request: Request,
	getSupabase: () => SupabaseClient<Database>,
	supabaseUrl: string
): Promise<Response | null> {
	if (!isCrawler(request.headers.get('user-agent'))) return null

	const url = new URL(request.url)
	const ogData = await fetchOGData(url.pathname, getSupabase(), supabaseUrl)
	if (!ogData) return null

	const baseUrl = `${url.protocol}//${url.host}`
	return new Response(generateOGHtml(ogData, baseUrl), {
		headers: { 'Content-Type': 'text/html' },
	})
}
