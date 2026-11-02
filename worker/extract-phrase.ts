import * as z from 'zod'

const MAX_PHRASES = 8
// Data-URL characters, not decoded bytes. The client downscales to well
// under this, so a request over it did not come from our client.
const MAX_IMAGE_CHARS = 6_000_000

export const ExtractRequestSchema = z.object({
	image: z
		.string()
		.max(MAX_IMAGE_CHARS)
		.regex(/^data:image\/(png|jpeg|webp);base64,/),
	lang: z.string().length(3),
	langName: z.string().min(1),
	translationLang: z.string().length(3),
	translationLangName: z.string().min(1),
})

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>

export type ExtractedPhrase = {
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

function buildPrompt(body: ExtractRequest) {
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

// With a JSON schema, `content` can still arrive wrapped in a ```json fence.
export function parseModelContent(content: unknown): unknown {
	if (typeof content !== 'string') return content
	const unfenced = content
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/, '')
	return JSON.parse(unfenced)
}

function trimmedOrNull(value: unknown) {
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function cleanPhrases(raw: unknown): Array<ExtractedPhrase> {
	const list = (raw as { phrases?: unknown })?.phrases
	if (!Array.isArray(list)) return []
	const seen = new Set<string>()
	const out: Array<ExtractedPhrase> = []
	for (const item of list as Array<Record<string, unknown>>) {
		const text = trimmedOrNull(item?.text)
		if (!text || seen.has(text)) continue
		seen.add(text)
		out.push({
			text,
			lang: trimmedOrNull(item?.lang) ?? '',
			transliteration: trimmedOrNull(item?.transliteration),
			translation: trimmedOrNull(item?.translation),
		})
	}
	return out.slice(0, MAX_PHRASES)
}

export async function extractPhrases(
	env: Pick<Env, 'AI' | 'PHOTO_EXTRACT_MODEL' | 'AI_GATEWAY_ID'>,
	body: ExtractRequest
): Promise<Array<ExtractedPhrase>> {
	const output = await env.AI.run(
		env.PHOTO_EXTRACT_MODEL,
		{
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
			chat_template_kwargs: { enable_thinking: false },
			temperature: 0,
			max_completion_tokens: 2048,
		},
		{ gateway: { id: env.AI_GATEWAY_ID } }
	)
	return cleanPhrases(parseModelContent(output.choices[0]?.message?.content))
}
