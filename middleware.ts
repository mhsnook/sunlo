/**
 * Vercel Edge Middleware for Social Previews
 *
 * This middleware intercepts requests from social media crawlers and returns
 * a minimal HTML page with Open Graph meta tags for link previews.
 *
 * The app is a pure SPA (no SSR), so this edge middleware runs separately
 * to serve OG tags to crawlers while the main app remains client-side only.
 *
 * Supported platforms: Facebook, Instagram, Twitter/X, LinkedIn, WhatsApp,
 * Signal, Slack, Telegram, Discord, Pinterest, and search engines.
 */

import { createClient } from '@supabase/supabase-js'

export const config = {
	matcher: [
		'/learn/:lang',
		'/learn/:lang/feed',
		'/learn/:lang/phrases/:id*',
		'/learn/:lang/playlists/:id*',
		'/learn/:lang/requests/:id*',
	],
}

// Language code to name mapping (subset of most common languages)
const LANGUAGES: Record<string, string> = {
	hin: 'Hindi',
	tam: 'Tamil',
	kan: 'Kannada',
	tel: 'Telugu',
	mal: 'Malayalam',
	mar: 'Marathi',
	ben: 'Bangla',
	guj: 'Gujarati',
	pan: 'Punjabi',
	urd: 'Urdu',
	spa: 'Spanish',
	fra: 'French',
	deu: 'German',
	ita: 'Italian',
	por: 'Portuguese',
	rus: 'Russian',
	jpn: 'Japanese',
	kor: 'Korean',
	zho: 'Chinese',
	ara: 'Arabic',
	tha: 'Thai',
	vie: 'Vietnamese',
	ind: 'Indonesian',
	msa: 'Malay',
	tgl: 'Tagalog',
	swa: 'Swahili',
	yor: 'Yoruba',
	ibo: 'Igbo',
	hau: 'Hausa',
	mya: 'Burmese',
	nep: 'Nepali',
	sin: 'Sinhala',
}

function getLanguageName(code: string): string {
	return LANGUAGES[code] || code.toUpperCase()
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchOGData(
	path: string,
	supabase: any
): Promise<OGData | null> {
	for (const route of OG_ROUTES) {
		const match = path.match(route.pattern)
		if (!match) continue

		const [, lang, id] = match
		const langName = getLanguageName(lang)

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
					const supabaseUrl = process.env.VITE_SUPABASE_URL
					const imageUrl =
						data.cover_image_path && supabaseUrl ?
							`${supabaseUrl}/storage/v1/object/public/avatars/${data.cover_image_path}`
						:	undefined

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
					learnerCount === 0 ? 'Start learning'
					: learnerCount === 1 ? 'Join 1 learner'
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

export default async function middleware(request: Request) {
	const userAgent = request.headers.get('user-agent')
	const url = new URL(request.url)
	const path = url.pathname

	// Only intercept for crawlers
	if (!isCrawler(userAgent)) return

	const supabaseUrl = process.env.VITE_SUPABASE_URL
	const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		console.error('Missing Supabase environment variables')
		return
	}

	const supabase = createClient(supabaseUrl, supabaseAnonKey)
	const ogData = await fetchOGData(path, supabase)

	if (!ogData) return

	const baseUrl = `${url.protocol}//${url.host}`
	const html = generateOGHtml(ogData, baseUrl)

	return new Response(html, {
		headers: { 'Content-Type': 'text/html' },
	})
}
