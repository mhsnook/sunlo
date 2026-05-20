// Edge Function: tts
//
// Authenticated. Accepts { text, lang } and synthesizes speech with
// Cloudflare Workers AI, returning a base64-encoded MP3.
//
// Cloudflare's general-purpose TTS model is MeloTTS, which covers
// en/es/fr/zh/jp/kr. There is no Hindi-capable TTS model on Workers AI
// today — TTS_BY_LANG maps each supported Sunlo language (ISO 639-3) to a
// model and the model's own language code. Add a row here as Cloudflare
// ships coverage for more languages.
//
// Set in the Supabase dashboard (deploy) and supabase/functions/.env
// (local) — shared with the `search` function:
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')

type TtsConfig = { model: string; lang: string }

// Sunlo language code (ISO 639-3) -> Workers AI model + the model's own
// language code. A language is only listed once Cloudflare actually has a
// model that can speak it.
const TTS_BY_LANG: Record<string, TtsConfig> = {
	eng: { model: '@cf/myshell-ai/melotts', lang: 'en' },
	spa: { model: '@cf/myshell-ai/melotts', lang: 'es' },
	fra: { model: '@cf/myshell-ai/melotts', lang: 'fr' },
	zho: { model: '@cf/myshell-ai/melotts', lang: 'zh' },
	jpn: { model: '@cf/myshell-ai/melotts', lang: 'jp' },
	kor: { model: '@cf/myshell-ai/melotts', lang: 'kr' },
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	})
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS })
	}
	if (req.method !== 'POST') {
		return json({ error: 'Method not allowed' }, 405)
	}
	if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
		return json({ error: 'Workers AI keys are not configured' }, 503)
	}

	let body: { text?: string; lang?: string }
	try {
		body = await req.json()
	} catch {
		return json({ error: 'Invalid JSON' }, 400)
	}

	const text = body.text?.trim()
	if (!text) return json({ error: 'Missing text' }, 400)
	if (!body.lang) return json({ error: 'Missing lang' }, 400)

	const config = TTS_BY_LANG[body.lang]
	if (!config) {
		return json(
			{ error: `Text-to-speech isn't available for this language yet` },
			422
		)
	}

	try {
		const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${config.model}`
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${CF_API_TOKEN}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ prompt: text, lang: config.lang }),
		})

		if (!res.ok) {
			const detail = await res.text()
			throw new Error(`Workers AI TTS failed: ${res.status} ${detail}`)
		}

		const result = await res.json()
		const audio = result?.result?.audio
		if (typeof audio !== 'string') {
			throw new Error('Workers AI TTS returned no audio')
		}

		// MeloTTS returns a base64-encoded MP3; pass it straight through so the
		// browser can build a `data:` URL without any binary juggling.
		return json({ audio, mime: 'audio/mpeg' })
	} catch (err) {
		console.error('tts error:', err)
		return json({ error: (err as Error).message ?? 'Internal error' }, 500)
	}
})
