import { defineTool, type PromptImage } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import * as v from 'valibot'
import {
	ASPECT_RATIOS,
	MAX_PAINTER_REFERENCES,
	MAX_PAINTING_BYTES,
	MAX_STYLES_PER_PAINTING,
	MAX_SVG_BYTES,
	PAINTER_MODELS,
	PAINTINGS_PER_HOUR,
	SKETCHES_PER_HOUR,
	SVGS_PER_HOUR,
	type CrewKey,
	type PaintingType,
	type SvgRefType,
} from '../../shared/crew'
import { frames, screenshots, type Frame } from '../../worker/browser'
import { imageInfo, toBase64 } from '../../worker/images'
import {
	looksLikeSvg,
	modelInput,
	PAINT_TIMEOUT_MS,
	paintingPrompt,
	runPainter,
} from '../../worker/painter'
import { checkSvg, svgPage, svgViewport } from '../../worker/svg'
import { roomFor } from '../crew'
import { assertBlocks, Text } from './posting'

const Id = v.pipe(v.number(), v.integer())
const FrameInput = v.picklist(['phone', 'desktop'])
const frameLine = (frame: Frame) =>
	`${frame} (${frames[frame].width}×${frames[frame].height})`

// A path is a page of the app, on production unless the path is a URL.
const resolveUrl = (target: string) => {
	const url = new URL(target, env.SUNLO_URL)
	if (url.protocol !== 'https:' && url.protocol !== 'http:') {
		throw new Error(`Give an http(s) URL or a path such as /learn: ${target}`)
	}
	return url.href
}

// The design officer's tools: looking at the app, and drawing mockups the
// admin can take away.
export function designTools(agent: CrewKey) {
	const lookAtScreen = defineTool({
		name: 'look_at_screen',
		description: `Look at a screen and answer a question about it: a page of the app, or one of your sketches. Give \`url\` as a path on ${env.SUNLO_URL}, such as /learn, or a whole URL, such as a pull request's preview; or give \`sketch\` instead. The browser is signed out, so you see what a visitor sees. Each look renders one viewport of each frame you ask for: phone is 390×844, desktop is 1440×900. Ask a pointed question, such as "What does a new visitor read first?"; the answer is what you saw, in words.`,
		input: v.object({
			url: v.optional(v.pipe(Text, v.maxLength(2000))),
			sketch: v.optional(Id),
			frames: v.optional(v.array(FrameInput), ['phone']),
			question: v.pipe(Text, v.maxLength(1000)),
		}),
		harness: true,
		annotations: { readOnlyHint: true },
		async run({ data, harness }) {
			let images: Array<PromptImage>
			let what: string
			if (data.sketch !== undefined) {
				const room = await roomFor()
				const [sketch, shot] = await Promise.all([
					room.sketch(data.sketch),
					room.sketchImage(data.sketch),
				])
				if (!sketch || !shot) throw new Error(`No sketch ${data.sketch}.`)
				images = [
					{
						type: 'image',
						data: toBase64(new Uint8Array(shot.image)),
						mimeType: shot.mimeType,
					},
				]
				what = `sketch ${data.sketch} (${sketch.label}: ${sketch.idea}), in the ${frameLine(sketch.frame)} frame`
			} else if (data.url) {
				const url = resolveUrl(data.url)
				const wanted: Array<Frame> = data.frames.length
					? [...new Set(data.frames)]
					: ['phone']
				const shots = await screenshots(
					env.BROWSER,
					wanted.map((frame) => ({ page: { url }, frame }))
				)
				images = shots.map((shot) => ({
					type: 'image',
					data: toBase64(shot.image),
					mimeType: shot.mimeType,
				}))
				what = `${url}, in the ${wanted.map(frameLine).join(' and ')} frame${wanted.length > 1 ? 's, in that order' : ''}`
			} else {
				throw new Error('Give a url or a sketch to look at.')
			}
			const seen = await harness.prompt(
				`These are screenshots of ${what}. Answer this question about them as a product designer would, plainly and specifically: ${data.question}\n\nThen note anything else a designer would flag: hierarchy, spacing, type, colour, contrast, and text that is cut off, overlapping or hard to read. Quote on-screen text exactly where it matters. Say what is there; do not guess at what is off screen.`,
				{ images }
			)
			return { output: { looked_at: what, seen: seen.text } }
		},
	})

	const sketchScreens = defineTool({
		name: 'sketch_screens',
		description: `Draw mockups for the admin and post them as one card in your room, with a button to go with each. Each proposal is a whole HTML document you write: inline CSS, real Sunlo text and data (never lorem ipsum), and no scripts. Web fonts from Google Fonts load. The browser renders one viewport of the frame: phone is 390×844, desktop is 1440×900, so lay the screen out to fit it. Give each proposal a one-line \`idea\`. \`body\` is your message on the card: what you were asked, and how the proposals differ. You can make ${SKETCHES_PER_HOUR} sketches an hour.`,
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(2000)),
			frame: FrameInput,
			proposals: v.pipe(
				v.array(
					v.object({
						idea: v.pipe(Text, v.maxLength(200)),
						html: v.pipe(Text, v.maxLength(60_000)),
					})
				),
				v.minLength(1),
				v.maxLength(4)
			),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const left = await (await roomFor()).sketchesLeft(agent)
			if (data.proposals.length > left) {
				throw new Error(
					`Nothing was drawn: you can make ${left} more sketch${left === 1 ? '' : 'es'} this hour.`
				)
			}
			const posted = await step.do('sketch', async () => {
				const shots = await screenshots(
					env.BROWSER,
					data.proposals.map((proposal) => ({
						page: { html: proposal.html },
						frame: data.frame,
					}))
				)
				return (await roomFor()).postSketches({
					agent,
					title: data.title,
					body: data.body,
					frame: data.frame,
					proposals: data.proposals.map((proposal, index) => ({
						...proposal,
						image: shots[index].image,
						mimeType: shots[index].mimeType,
					})),
				})
			})
			if (!posted.ok) throw new Error(posted.error)
			return {
				output: {
					messageId: posted.messageId,
					sketches: posted.sketches.map(({ id, label }) => ({ id, label })),
				},
			}
		},
	})

	const readSketch = defineTool({
		name: 'read_sketch',
		description:
			'Read the HTML of one of your sketches, to draw the next version from it.',
		input: v.object({ id: Id }),
		annotations: { readOnlyHint: true },
		async run({ data }) {
			const sketch = await (await roomFor()).sketch(data.id)
			if (!sketch) throw new Error(`No sketch ${data.id}.`)
			const { label, idea, frame, html } = sketch
			return { output: { label, idea, frame, html } }
		},
	})

	const painterStyles = defineTool({
		name: 'painter_styles',
		description:
			"List the painter's styles: each one's name, what it looks like, the model that paints it, and the image ids of its examples, which you can look at with look_at_image. The admin manages the list in the room's details.",
		input: v.object({}),
		annotations: { readOnlyHint: true },
		async run() {
			const styles = await (await roomFor()).painterStyles()
			return {
				output: styles.map((style) => ({
					name: style.name,
					description: style.description,
					model: PAINTER_MODELS[style.model].label,
					referenceImages: PAINTER_MODELS[style.model].references,
					svg: PAINTER_MODELS[style.model].svg,
					examples: style.examples.map((image) => image.id),
				})),
			}
		},
	})

	const paint = defineTool({
		name: 'paint',
		description: `Have image models paint one idea of yours in up to ${MAX_STYLES_PER_PAINTING} very different styles, and post the paintings as one card in your room, with a "Go with" for each. Pick styles by name from painter_styles. \`brief\` is the subject and composition, in your words: what is in the picture, where, what someone reads first, and any text, quoted exactly. Keep it tight and concrete. Each style's own prompt sets the look, so leave style words out of the brief. \`references\` are image ids (a pasted screenshot, an earlier painting, an SVG's rendering) and \`sketches\` are sketch ids, at most ${MAX_PAINTER_REFERENCES} in all: the models keep their layout and repaint the rest. Recraft styles take no reference images. \`body\` is your message on the card. The paintings are over the top on purpose: look at them with look_at_image, take what works, and redraw it within Sunlo's brand with sketch_screens. You can have ${PAINTINGS_PER_HOUR} paintings an hour.`,
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(2000)),
			brief: v.pipe(Text, v.maxLength(3000)),
			styles: v.pipe(
				v.array(v.pipe(Text, v.maxLength(60))),
				v.minLength(1),
				v.maxLength(MAX_STYLES_PER_PAINTING)
			),
			references: v.optional(
				v.pipe(v.array(Id), v.maxLength(MAX_PAINTER_REFERENCES)),
				[]
			),
			sketches: v.optional(
				v.pipe(v.array(Id), v.maxLength(MAX_PAINTER_REFERENCES)),
				[]
			),
			aspect: v.optional(v.picklist(ASPECT_RATIOS), '4:5'),
		}),
		durable: true,
		timeoutMs: PAINT_TIMEOUT_MS + 60_000,
		async run({ data, step, signal }) {
			assertBlocks(data.body)
			const references = await step.do('references', async () => {
				const r = await roomFor()
				const images = await r.findImages(data.references)
				if (!images) throw new Error('One of those reference images is gone.')
				const sketches = await Promise.all(
					data.sketches.map(async (id) => {
						const image = await r.sketchAsImage(id)
						if (!image) throw new Error(`No sketch ${id}.`)
						return image
					})
				)
				return [...images, ...sketches].map((image) => image.id)
			})
			const reserved = await step.do('reserve', async () =>
				(await roomFor()).reservePaintings({
					agent,
					styles: data.styles,
					references: data.references.length + data.sketches.length,
				})
			)
			if (!reserved.ok) throw new Error(reserved.error)
			const room = await roomFor()
			const links = references.length
				? await room.referenceLinks(references)
				: []
			const referenceUrls = links ?? []
			const painted = await Promise.all(
				reserved.paintings.map(({ id, label, style }) =>
					step.do(`paint:${id}`, async () => {
						const usable = Math.min(
							referenceUrls.length,
							PAINTER_MODELS[style.model].references
						)
						const prompt = paintingPrompt({
							style,
							brief: data.brief,
							references: usable,
						})
						const painting: PaintingType & { prompt: string } = {
							id,
							label,
							style: style.name,
							model: style.model,
							prompt,
							image: null,
							svg: null,
							error: null,
						}
						try {
							const result = await runPainter(
								(model, input, options) => env.AI.run(model, input, options),
								style.model,
								modelInput(style.model, {
									prompt,
									aspect: data.aspect,
									referenceUrls,
								}),
								{ maxBytes: MAX_PAINTING_BYTES, signal }
							)
							if (looksLikeSvg(result.bytes)) {
								const checked = checkSvg(new TextDecoder().decode(result.bytes))
								if (!checked.ok) throw new Error(checked.error)
								const [svg] = await saveSvgs(agent, [
									{
										title: `${style.name}: ${data.title}`.slice(0, 140),
										...checked,
									},
								])
								return { ...painting, svg }
							}
							const info = imageInfo(result.bytes)
							if (!info) {
								throw new Error(
									`The model sent a picture the room cannot keep (${result.contentType || 'unknown type'}).`
								)
							}
							const image = await (
								await roomFor()
							).saveImage({
								kind: 'painting',
								author: agent,
								...info,
								bytes: result.bytes.slice().buffer,
							})
							return { ...painting, image }
						} catch (error) {
							// Flue has given up on an aborted call: recording the abort as the
							// painting's error would let the run go on to post a card.
							if (signal?.aborted) throw error
							return {
								...painting,
								error: error instanceof Error ? error.message : String(error),
							}
						}
					})
				)
			)
			signal?.throwIfAborted()
			const vectors = painted.flatMap((painting) =>
				painting.svg ? [painting.svg] : []
			)
			const rendered = vectors.length
				? await step.do('render', () => renderSvgs(agent, vectors))
				: []
			const results: typeof painted = []
			for (const painting of painted) {
				const svg = rendered.find((r) => r.id === painting.svg?.id)
				results.push(svg ? { ...painting, svg } : painting)
			}
			signal?.throwIfAborted()
			const posted = await step.do('post', async () =>
				(await roomFor()).postPaintings({
					agent,
					title: data.title,
					body: data.body,
					paintings: results,
				})
			)
			return {
				output: {
					messageId: posted.messageId,
					paintings: posted.paintings.map((painting) => ({
						label: painting.label,
						style: painting.style,
						image: painting.image?.id ?? null,
						svg: painting.svg?.id ?? null,
						svgRendering: painting.svg?.png ?? null,
						failed: painting.error,
					})),
					...(!links
						? {
								note: 'The reference images were left out: the models fetch them from the admin app, and the room does not know its public HTTPS address yet. It learns it when the admin opens the app.',
							}
						: {}),
				},
			}
		},
	})

	const drawSvg = defineTool({
		name: 'draw_svg',
		description: `Draw SVGs yourself, such as icons, spot illustrations and diagrams, and post them as one card in your room, where the admin can copy or download each. Each \`svg\` is a whole <svg> document with a viewBox. It may hold shapes, text, gradients, <style> and data:image pictures; it may not hold script, event handlers such as onclick, javascript: links, <foreignObject>, URLs in attributes other than href, CSS escapes, or links to other files, and the room refuses one that does. Each SVG also gets a PNG rendering you can look at with look_at_image. \`body\` is your message on the card. You can draw ${SVGS_PER_HOUR} SVGs an hour.`,
		input: v.object({
			title: v.pipe(Text, v.maxLength(140)),
			body: v.pipe(Text, v.maxLength(2000)),
			svgs: v.pipe(
				v.array(
					v.object({
						title: v.pipe(Text, v.maxLength(140)),
						svg: v.pipe(Text, v.maxLength(MAX_SVG_BYTES)),
					})
				),
				v.minLength(1),
				v.maxLength(4)
			),
		}),
		durable: true,
		async run({ data, step }) {
			assertBlocks(data.body)
			const checked = data.svgs.map((drawn, index) => {
				const result = checkSvg(drawn.svg)
				if (!result.ok) {
					throw new Error(
						`Nothing was posted. SVG ${index + 1} (${drawn.title}): ${result.error}`
					)
				}
				return { title: drawn.title, ...result }
			})
			const left = await step.do('limit', async () =>
				(await roomFor()).svgsLeft(agent)
			)
			if (checked.length > left) {
				throw new Error(
					`Nothing was posted: you can draw ${left} more SVG${left === 1 ? '' : 's'} this hour, out of ${SVGS_PER_HOUR}.`
				)
			}
			const posted = await step.do('draw', async () => {
				const svgs = await renderSvgs(
					agent,
					await saveSvgs(agent, checked),
					checked.map((item) => item.svg)
				)
				const messageId = await (
					await roomFor()
				).postSvgs({ agent, title: data.title, body: data.body, svgs })
				return { messageId, svgs }
			})
			return {
				output: {
					messageId: posted.messageId,
					svgs: posted.svgs.map((svg) => ({
						id: svg.id,
						title: svg.title,
						rendering: svg.png,
					})),
				},
			}
		},
	})

	return [
		lookAtScreen,
		sketchScreens,
		readSketch,
		painterStyles,
		paint,
		drawSvg,
	]
}

// Keeps SVGs that passed checkSvg, without their renderings.
async function saveSvgs(
	author: CrewKey,
	checked: Array<{ title: string; svg: string; width: number; height: number }>
): Promise<Array<SvgRefType>> {
	const room = await roomFor()
	return Promise.all(
		checked.map((item) =>
			room.saveSvg({
				author,
				title: item.title,
				text: item.svg,
				width: item.width,
				height: item.height,
				png: null,
			})
		)
	)
}

// Renders SVGs to PNGs in one browser session and keeps each PNG with its
// SVG. An SVG that fails to render keeps no PNG. `texts` saves reading back
// SVGs the caller still holds.
async function renderSvgs(
	author: CrewKey,
	svgs: Array<SvgRefType>,
	texts?: Array<string>
): Promise<Array<SvgRefType>> {
	const room = await roomFor()
	const sources =
		texts ??
		(await Promise.all(
			svgs.map(async (svg) => (await room.svg(svg.id))?.text ?? '')
		))
	const shots = await screenshots(
		env.BROWSER,
		svgs.map((svg, index) => ({
			page: { html: svgPage(sources[index]) },
			frame: svgViewport(svg),
		}))
	).catch((error: unknown) => {
		console.error('Could not render an SVG', error)
		return null
	})
	return Promise.all(
		svgs.map(async (svg, index) => {
			const shot = shots?.[index]
			const info = shot ? imageInfo(shot.image) : null
			if (!shot || !info) return svg
			const png = await room.saveImage({
				kind: 'svg',
				author,
				...info,
				bytes: shot.image.slice().buffer,
			})
			await room.setSvgPng(svg.id, png.id)
			return { ...svg, png: png.id }
		})
	)
}
