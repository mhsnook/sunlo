import { defineTool, type PromptImage } from '@flue/runtime'
import { env } from 'cloudflare:workers'
import * as v from 'valibot'
import { SKETCHES_PER_HOUR, type CrewKey } from '../../shared/crew'
import { frames, screenshots, toBase64, type Frame } from '../../worker/browser'
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

	return [lookAtScreen, sketchScreens, readSketch]
}
