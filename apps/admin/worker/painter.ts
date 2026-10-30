import {
	ASPECT_RATIOS,
	MAX_PAINTER_REFERENCES,
	PAINTER_MODELS,
	PAINTINGS_PER_HOUR,
	type PainterModel,
	type PainterStyleInputType,
} from '../shared/crew'

// product-2's painter: a plain image-model call per style, with a prompt
// built from the style and product-2's brief. No agent runs here.

export type PaintAspect = (typeof ASPECT_RATIOS)[number]

// The styles a room starts with. Each pushes its look to the extreme on
// purpose: product-2 takes what works from the results and redraws it
// within the brand.
export const DEFAULT_PAINTER_STYLES: Array<
	Omit<PainterStyleInputType, 'examples'>
> = [
	{
		name: 'Minimalist',
		description: 'One idea per screen, vast white space, a single accent.',
		model: 'black-forest-labs/flux-3-image-klein',
		prompt:
			'Radical minimalism taken as far as it goes. Nearly empty canvas of warm off-white, one dominant element, everything else removed. A single saturated accent colour used once. Hairline rules, generous margins that feel extravagant, type set small and precise. Flat, no shadows, no gradients, no decoration. Gallery-wall calm with one surprising focal point.',
	},
	{
		name: 'Maximalist',
		description: 'Every surface busy: pattern on pattern, clashing colour.',
		model: 'black-forest-labs/flux-3-image-klein',
		prompt:
			'Unapologetic maximalism. Every surface layered with pattern on pattern, clashing saturated colours, oversized display type crashing into stickers, badges, ribbons and confetti. Collage energy, dense overlapping cards, bold outlines, nothing left empty. Joyful sensory overload that still has one clear thing to tap.',
	},
	{
		name: 'Swiss editorial',
		description: 'Strict grid, huge grotesque type, red and black.',
		model: 'black-forest-labs/flux-3-image-klein',
		prompt:
			'International Typographic Style pushed to the limit: a strict visible modular grid, enormous tightly kerned grotesque headlines, flush-left ragged-right text, asymmetric layout, black and white with one signal red. Numbers set huge as graphic elements. Feels like a 1960s Swiss poster and a modern magazine spread at once.',
	},
	{
		name: 'Toy-like',
		description: 'Chunky, squishy, glossy 3D, like a children’s toy.',
		model: 'krea/krea-3',
		prompt:
			'Playful toy-like 3D: every element is a chunky, rounded, glossy plastic or soft clay object with exaggerated bevels, bouncy proportions and candy colours. Buttons look pressable and squishy, cards are thick tiles, icons are little figurines. Soft studio lighting, gentle shadows, a sense of fun and touch.',
	},
	{
		name: 'Risograph',
		description: 'Two-colour print: grain, misregistration, halftones.',
		model: 'black-forest-labs/flux-3-image-klein',
		prompt:
			'Risograph print look at full strength: two or three spot inks (fluorescent pink, teal, sunflower yellow) overprinting on uncoated paper, heavy grain, visible halftone dots, slight misregistration between layers, hand-cut shapes, chunky condensed type. Tactile, imperfect, zine-like.',
	},
	{
		name: 'Luxury',
		description: 'Black, gold foil, serif capitals, rich materials.',
		model: 'krea/krea-3',
		prompt:
			'Ultra-luxury editorial: deep black and ivory with gold-foil details, high-contrast serif display type in spaced capitals, thin gilded rules, rich materials such as velvet, marble and embossed paper. Dramatic low-key lighting, restraint, the feel of a haute couture invitation or a perfume campaign.',
	},
	{
		name: 'Brutalist',
		description: 'Raw web brutalism: system fonts, hard borders, loud.',
		model: 'black-forest-labs/flux-3-image-klein',
		prompt:
			'Raw web brutalism: default system fonts at aggressive sizes, thick black borders, hard drop shadows with no blur, primary colours at full saturation, visible structure, overlapping blocks, underlined links, no rounded corners. Deliberately unpolished, honest and loud, like a hand-coded 1990s page redesigned by an art school.',
	},
	{
		name: 'Hand-drawn',
		description: 'Ink and marker on paper, wobbly lines, doodles.',
		model: 'krea/krea-3',
		prompt:
			'Everything hand-drawn: ink and marker on textured sketchbook paper, wobbly confident lines, hand-lettered headings, crosshatching, doodled arrows and annotations in the margins, watercolour washes as fills. Warm, personal, like a designer’s notebook page photographed flat.',
	},
	{
		name: 'Retro-futurist',
		description: '1970s space-age future: chrome, neon, CRT glow.',
		model: 'krea/krea-3',
		prompt:
			'Retro-futurism as imagined in the 1970s and 80s: chrome and brushed metal panels, neon tubes, CRT scanlines and glow, sunset gradients of magenta and orange over grid horizons, rounded bezels, space-age typography. Cinematic, glowing, nostalgic and bold.',
	},
	{
		name: 'Flat illustration',
		description: 'Bold flat vector shapes, no outlines, a tight palette.',
		model: 'recraft/recraftv4-1-flash',
		prompt:
			'Bold flat vector illustration: geometric shapes with no outlines, a tight palette of four or five colours, big simple characters and objects at exaggerated scale, smooth curves, no texture or gradients. Clean, graphic and confident, like a modern editorial spot illustration.',
	},
]

// What a paint call may do before any model runs: each style name must
// exist (ignoring case), the paintings must fit in what is left of the hour,
// and the reference images must fit the cap.
export function checkPaintRequest<Style extends { name: string }>(input: {
	names: Array<string>
	known: Array<Style>
	left: number
	references: number
}): { ok: true; styles: Array<Style> } | { ok: false; error: string } {
	const { names, known, left, references } = input
	if (references > MAX_PAINTER_REFERENCES) {
		return {
			ok: false,
			error: `Nothing was painted: give at most ${MAX_PAINTER_REFERENCES} reference images and sketches in all.`,
		}
	}
	const styles: Array<Style> = []
	for (const name of names) {
		const style = known.find(
			(s) => s.name.toLowerCase() === name.trim().toLowerCase()
		)
		if (!style) {
			return {
				ok: false,
				error: `Nothing was painted: there is no style named ${name}. The styles are ${known.map((s) => s.name).join(', ')}.`,
			}
		}
		styles.push(style)
	}
	if (styles.length > left) {
		return {
			ok: false,
			error: `Nothing was painted: you can have ${left} more painting${left === 1 ? '' : 's'} this hour, out of ${PAINTINGS_PER_HOUR}.`,
		}
	}
	return { ok: true, styles }
}

export function paintingPrompt(input: {
	style: { name: string; prompt: string }
	brief: string
	references: number
}) {
	const { style, brief, references } = input
	const lines = [
		`Style, ${style.name}: ${style.prompt}`,
		'Render it in the most dramatic way the style allows: push the look to its extreme, with strong contrast and confident choices. Nothing generic, nothing timid.',
		`Subject and composition: ${brief}`,
	]
	if (references === 1) {
		lines.push(
			'The reference image is a layout sketch: keep its structure and the placement of its parts, and repaint everything else in the style.'
		)
	} else if (references > 1) {
		lines.push(
			`The ${references} reference images are layout sketches and screenshots, in the order the brief names them: keep their structure and the placement of their parts, and repaint everything else in the style.`
		)
	}
	lines.push(
		'Any text in the picture is short, legible and spelled exactly as the brief gives it.'
	)
	return lines.join('\n\n')
}

// The input each model's schema takes (Cloudflare's model pages, "API
// Schemas"). A model that takes fewer reference images gets the first ones.
export function modelInput(
	model: PainterModel,
	input: { prompt: string; aspect: PaintAspect; referenceUrls: Array<string> }
): Record<string, unknown> {
	const references = input.referenceUrls.slice(
		0,
		PAINTER_MODELS[model].references
	)
	switch (model) {
		case 'black-forest-labs/flux-3-image-klein':
			return {
				prompt: input.prompt,
				aspect_ratio: input.aspect,
				resolution: '1k',
				...(references.length ? { images: references } : {}),
			}
		case 'krea/krea-3':
			return {
				prompt: input.prompt,
				aspect_ratio: input.aspect,
				resolution: '1K',
				...(references.length ? { image_urls: references } : {}),
			}
		case 'recraft/recraftv4-1-flash':
		case 'recraft/recraftv4-1-vector':
			return { prompt: input.prompt, size: input.aspect }
	}
}

export type ModelResult =
	| { state: 'done'; url: string }
	// The picture itself, base64, from a model that answers inline.
	| { state: 'inline'; base64: string; contentType: string }
	| { state: 'pending'; status: string }
	| { state: 'failed'; error: string }

const record = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null
const text = (value: unknown) => (typeof value === 'string' ? value : null)

const FAILED =
	/^(failed|failure|error|errored|cancell?ed|(content|request)[ _]moderated|moderated)$/i
const DONE = /^(completed?|ready|succeeded|success)$/i

// What a model's answer says. The shapes Cloudflare documents differ by
// model and by page: the output schemas say `{ image }`; the examples wrap
// it as `{ state, result: { image } }`, as BFL's `{ id, status, result: {
// sample } }`, or as Krea's job, `{ job_id, status, result: { urls } }`.
export function readModelResult(raw: unknown): ModelResult {
	const top = record(raw)
	if (!top)
		return { state: 'failed', error: 'The model answered with no image.' }
	const result = record(top.result) ?? top
	const url =
		text(result.image) ??
		text(result.sample) ??
		(Array.isArray(result.urls) ? text(result.urls[0]) : null) ??
		(Array.isArray(result.images) ? text(result.images[0]) : null)
	const status = text(top.status) ?? text(top.state)
	if (status && FAILED.test(status)) {
		const detail =
			text(top.error) ?? text(record(top.error)?.message) ?? text(top.details)
		return {
			state: 'failed',
			error: `The model's job ${status.toLowerCase()}${detail ? `: ${detail}` : ''}.`,
		}
	}
	if (url && /^https:\/\//i.test(url)) return { state: 'done', url }
	if (url && /^http:\/\//i.test(url)) {
		return {
			state: 'failed',
			error: `The model answered with an http:// link; the painter downloads over HTTPS only: ${url.slice(0, 60)}`,
		}
	}
	if (url) {
		const dataUri = /^data:([^;,]+);base64,(.*)$/s.exec(url)
		if (dataUri) {
			return { state: 'inline', contentType: dataUri[1], base64: dataUri[2] }
		}
		if (/^[A-Za-z0-9+/=\s]+$/.test(url)) {
			return { state: 'inline', contentType: '', base64: url }
		}
		return {
			state: 'failed',
			error: `The model answered with an image I cannot read: ${url.slice(0, 60)}`,
		}
	}
	if (status && !DONE.test(status)) {
		return { state: 'pending', status }
	}
	return { state: 'failed', error: 'The model answered with no image.' }
}

// How long one style may take, from the model call to the end of the
// download.
export const PAINT_TIMEOUT_MS = 150_000

export type Painted = {
	bytes: Uint8Array
	// The type the download said it was; the caller reads the real one from
	// the bytes.
	contentType: string
	// Where the model hosted it, or null for a picture it sent inline.
	url: string | null
}

const tooBig = (bytes: number | null, max: number) =>
	bytes === null
		? `The painting is over the ${max / 1e6} MB the room keeps.`
		: `The painting is ${(bytes / 1e6).toFixed(1)} MB, over the ${max / 1e6} MB the room keeps.`

// Reads a body without trusting content-length, which a server may leave
// out: it stops as soon as the bytes pass the cap.
export async function readCapped(response: Response, maxBytes: number) {
	const length = response.headers.get('content-length')
	if (length !== null && Number(length) > maxBytes) {
		await response.body?.cancel()
		throw new Error(tooBig(Number(length), maxBytes))
	}
	if (!response.body) return new Uint8Array(0)
	const chunks: Array<Uint8Array> = []
	let total = 0
	// Throwing out of the loop cancels the stream.
	for await (const chunk of response.body as ReadableStream<Uint8Array>) {
		total += chunk.byteLength
		if (total > maxBytes) throw new Error(tooBig(null, maxBytes))
		chunks.push(chunk)
	}
	const bytes = new Uint8Array(total)
	let at = 0
	for (const chunk of chunks) {
		bytes.set(chunk, at)
		at += chunk.byteLength
	}
	return bytes
}

// The keys and status of an answer, for the log: never its picture.
const answerShape = (raw: unknown) => {
	const top = record(raw)
	if (!top) return typeof raw
	const result = record(top.result)
	return JSON.stringify({
		keys: Object.keys(top),
		resultKeys: result ? Object.keys(result) : null,
		status: text(top.status) ?? text(top.state),
	})
}

// Runs one model and downloads its picture. The model's hosted URL expires,
// so the caller keeps the bytes.
export async function runPainter(
	run: (
		model: string,
		input: Record<string, unknown>,
		options: { signal: AbortSignal }
	) => Promise<unknown>,
	model: PainterModel,
	input: Record<string, unknown>,
	options: {
		fetch?: (url: string, init: { signal: AbortSignal }) => Promise<Response>
		signal?: AbortSignal
		timeoutMs?: number
		maxBytes: number
	}
): Promise<Painted> {
	const get = options.fetch ?? fetch
	const timeoutMs = options.timeoutMs ?? PAINT_TIMEOUT_MS
	const deadline = AbortSignal.timeout(timeoutMs)
	const signal = options.signal
		? AbortSignal.any([options.signal, deadline])
		: deadline
	const label = PAINTER_MODELS[model].label
	try {
		const raw = await run(model, input, { signal })
		const result = readModelResult(raw)
		if (result.state === 'pending') {
			console.warn('A painter model answered with an unfinished job', {
				model,
				shape: answerShape(raw),
			})
			throw new Error(
				`${label} answered with a job that is not finished (status ${result.status}), and the painter cannot wait on one. Try another style.`
			)
		}
		if (result.state === 'failed') throw new Error(result.error)
		if (result.state === 'inline') {
			const base64 = result.base64.replace(/\s+/g, '')
			if (Math.floor((base64.length * 3) / 4) > options.maxBytes + 2) {
				throw new Error(tooBig(null, options.maxBytes))
			}
			const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
			if (bytes.length > options.maxBytes) {
				throw new Error(tooBig(bytes.length, options.maxBytes))
			}
			return { bytes, contentType: result.contentType, url: null }
		}
		const download = await get(result.url, { signal })
		if (!download.ok) {
			await download.body?.cancel()
			throw new Error(
				`Downloading the painting failed: HTTP ${download.status}.`
			)
		}
		return {
			bytes: await readCapped(download, options.maxBytes),
			contentType: download.headers.get('content-type') ?? '',
			url: result.url,
		}
	} catch (error) {
		if (deadline.aborted && !options.signal?.aborted) {
			throw new Error(
				`${label} did not finish in ${Math.round(timeoutMs / 1000)} seconds.`,
				{ cause: error }
			)
		}
		throw error
	}
}

// True for bytes that hold an SVG document rather than a raster image.
export function looksLikeSvg(bytes: Uint8Array) {
	const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart()
	return /^(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(
		head
	)
}
