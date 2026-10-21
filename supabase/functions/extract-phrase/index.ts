// Edge Function: extract-phrase
//
// Reads the text in one image (a data URL) with a Workers AI vision model.
// Returns phrases with a transliteration and a translation. It has no
// database access.
//
// Signed-in users only: verify_jwt checks the signature, and the handler
// also requires role = 'authenticated' so the public anon key gets a 403.
//
// Set in Supabase dashboard (deploy) and supabase/functions/.env (local):
//   CLOUDFLARE_ACCOUNT_ID
//   CLOUDFLARE_API_TOKEN
//   PHOTO_EXTRACT_MODEL (optional, defaults to DEFAULT_MODEL)

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it'
const MAX_PHRASES = 8
// Data-URL characters, not decoded bytes. The client downscales to well
// under this, so a request over it did not come from our client.
const MAX_IMAGE_CHARS = 6_000_000

const CF_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')
const CF_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')
const MODEL = Deno.env.get('PHOTO_EXTRACT_MODEL') ?? DEFAULT_MODEL

type RequestBody = {
	image: string
	lang: string
	langName: string
	translationLang: string
	translationLangName: string
}

type ExtractedPhrase = {
	text: string
	lang: string
	transliteration: string | null
	translation: string | null
}

const OUTPUT_SCHEMA = {
	type: 'object',
	properties: {
		phrases: {
			type: 'array',
			maxItems: MAX_PHRASES,
			items: {
				type: 'object',
				properties: {
					text: { type: 'string' },
					lang: { type: 'string' },
					transliteration: { type: ['string', 'null'] },
					translation: { type: ['string', 'null'] },
				},
				required: ['text', 'lang', 'transliteration', 'translation'],
			},
		},
	},
	required: ['phrases'],
}

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
	})
}

// The runtime has already checked the signature (verify_jwt); this only
// reads the claims. JWT segments are base64url, which atob() rejects.
function jwtRole(req: Request): string | null {
	const auth = req.headers.get('Authorization')
	if (!auth?.startsWith('Bearer ')) return null
	const segments = auth.slice(7).split('.')
	if (segments.length !== 3) return null
	try {
		const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/')
		const payload = JSON.parse(atob(base64))
		return typeof payload.role === 'string' ? payload.role : null
	} catch {
		return null
	}
}

function buildPrompt(body: RequestBody) {
	return [
		`You help someone learning ${body.langName} (ISO 639-3 "${body.lang}") turn photos into flashcards.`,
		`Read every piece of text in the image. Return up to ${MAX_PHRASES} phrases worth learning, most prominent first.`,
		`Keep each phrase as one unit of meaning: a sign's message, a menu item, one line of dialogue. Do not split a sentence into words.`,
		`Skip text that has no language content, such as prices, phone numbers, URLs and brand names on their own.`,
		`For each phrase:`,
		`- "text": the phrase exactly as written in the image, in its original script. Fix nothing except obvious OCR noise.`,
		`- "lang": the ISO 639-3 code of the phrase's language. Prefer "${body.lang}" when the text could be either.`,
		`- "transliteration": a standard Latin-script romanization if the phrase is not already in Latin script, else null.`,
		`- "translation": a natural ${body.translationLangName} translation, or null if the phrase is already in ${body.translationLangName}.`,
		`If the image has no readable text, return an empty "phrases" array.`,
	].join('\n')
}

// Workers AI wraps chat-completion models in { result: { choices } }, while
// older models answer with { result: { response } }; with a JSON schema the
// content can arrive as a parsed object or as a string.
function readModelContent(payload: unknown): unknown {
	const result = (payload as { result?: Record<string, unknown> })?.result
	const choices = result?.choices as
		| Array<{ message?: { content?: unknown } }>
		| undefined
	const content = choices?.[0]?.message?.content ?? result?.response
	if (typeof content !== 'string') return content
	const unfenced = content
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '')
	return JSON.parse(unfenced)
}

function cleanPhrases(raw: unknown): Array<ExtractedPhrase> {
	const list = (raw as { phrases?: unknown })?.phrases
	if (!Array.isArray(list)) return []
	const seen = new Set<string>()
	const out: Array<ExtractedPhrase> = []
	for (const item of list) {
		const text = typeof item?.text === 'string' ? item.text.trim() : ''
		if (!text || seen.has(text)) continue
		seen.add(text)
		const optional = (value: unknown) =>
			typeof value === 'string' && value.trim() ? value.trim() : null
		out.push({
			text,
			lang: typeof item?.lang === 'string' ? item.lang.trim() : '',
			transliteration: optional(item?.transliteration),
			translation: optional(item?.translation),
		})
	}
	return out.slice(0, MAX_PHRASES)
}

async function extractViaWorkersAI(body: RequestBody) {
	const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CF_API_TOKEN}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: buildPrompt(body) },
						{ type: 'image_url', image_url: { url: body.image } },
					],
				},
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: 'extracted_phrases',
					schema: OUTPUT_SCHEMA,
					strict: true,
				},
			},
			temperature: 0,
			max_completion_tokens: 2048,
		}),
	})

	if (!res.ok) {
		const text = await res.text()
		throw new Error(`Workers AI request failed: ${res.status} ${text}`)
	}

	return cleanPhrases(readModelContent(await res.json()))
}

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: CORS_HEADERS })
	}
	if (req.method !== 'POST') {
		return json({ error: 'Method not allowed' }, 405)
	}

	if (jwtRole(req) !== 'authenticated') {
		return json({ error: 'Sign in to read text from photos' }, 403)
	}

	if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
		return json(
			{
				error:
					'Photo reading is not set up on this server (Workers AI keys missing)',
			},
			503
		)
	}

	let body: RequestBody
	try {
		body = await req.json()
	} catch {
		return json({ error: 'Invalid JSON' }, 400)
	}

	if (
		typeof body.image !== 'string' ||
		!/^data:image\/(png|jpeg|webp);base64,/.test(body.image)
	) {
		return json(
			{ error: 'Send the image as a PNG, JPEG or WebP data URL' },
			400
		)
	}
	if (body.image.length > MAX_IMAGE_CHARS) {
		return json({ error: 'The image is too large' }, 413)
	}
	if (!body.lang || !body.translationLang) {
		return json({ error: 'Missing lang or translationLang' }, 400)
	}

	try {
		const phrases = await extractViaWorkersAI(body)
		return json({ model: MODEL, phrases }, 200)
	} catch (err) {
		console.error('extract-phrase error:', err)
		return json({ error: (err as Error).message ?? 'Internal error' }, 502)
	}
})
