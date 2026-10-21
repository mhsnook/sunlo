import * as z from 'zod'
import supabase from '@/lib/supabase-client'
import languages from '@/lib/languages'

export const ExtractedPhraseSchema = z.object({
	text: z.string(),
	lang: z.string(),
	transliteration: z.string().nullable(),
	translation: z.string().nullable(),
})

export type ExtractedPhraseType = z.infer<typeof ExtractedPhraseSchema>

const ExtractResponseSchema = z.object({
	phrases: z.array(ExtractedPhraseSchema),
})

const USE_MOCK = import.meta.env.VITE_PHOTO_EXTRACT_USE_MOCK === 'true'

// Must stay under the edge function's MAX_IMAGE_CHARS once base64-encoded.
const MAX_EDGE_PX = 1600
const JPEG_QUALITY = 0.85

export async function imageFileToDataUrl(file: File): Promise<string> {
	let bitmap: ImageBitmap
	try {
		bitmap = await createImageBitmap(file)
	} catch {
		throw new Error(
			"This browser can't open that image. Try a JPEG, PNG or WebP photo."
		)
	}
	const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height))
	const canvas = document.createElement('canvas')
	canvas.width = Math.round(bitmap.width * scale)
	canvas.height = Math.round(bitmap.height * scale)
	canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
	bitmap.close()
	return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

export async function extractPhrasesFromImage({
	image,
	lang,
	translationLang,
}: {
	image: string
	lang: string
	translationLang: string
}): Promise<Array<ExtractedPhraseType>> {
	if (USE_MOCK) return mockExtract(lang, translationLang)

	const result = await supabase.functions.invoke<unknown>('extract-phrase', {
		body: {
			image,
			lang,
			langName: languages[lang] ?? lang,
			translationLang,
			translationLangName: languages[translationLang] ?? translationLang,
		},
	})
	if (result.error)
		throw new Error(await readFunctionError(result.error as Error))
	return ExtractResponseSchema.parse(result.data).phrases
}

// FunctionsHttpError keeps the Response in `context`; the edge function puts
// a human-readable reason in its `error` field.
async function readFunctionError(error: Error): Promise<string> {
	const context = (error as { context?: Response }).context
	try {
		const body = (await context?.json()) as { error?: unknown } | undefined
		if (typeof body?.error === 'string') return body.error
	} catch {
		// Not JSON; fall through to the generic message.
	}
	return error.message
}

async function mockExtract(
	lang: string,
	translationLang: string
): Promise<Array<ExtractedPhraseType>> {
	await new Promise((resolve) => setTimeout(resolve, 400))
	return [
		{
			text: 'नमस्ते, आपका स्वागत है',
			lang,
			transliteration: 'namaste, aapka svaagat hai',
			translation: translationLang === 'eng' ? 'Hello, you are welcome' : null,
		},
		{
			text: 'कृपया जूते बाहर उतारें',
			lang,
			transliteration: 'kripaya joote baahar utaaren',
			translation:
				translationLang === 'eng' ? 'Please take your shoes off outside' : null,
		},
	]
}
