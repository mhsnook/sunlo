import { describe, expect, it, vi } from 'vitest'
import {
	MAX_PAINTER_REFERENCES,
	PAINTER_MODELS,
	PAINTINGS_PER_HOUR,
	painterModelIds,
} from '../shared/crew'
import {
	checkPaintRequest,
	DEFAULT_PAINTER_STYLES,
	looksLikeSvg,
	modelInput,
	paintingPrompt,
	readModelResult,
	runPainter,
} from './painter'

const style = { name: 'Risograph', prompt: 'Two spot inks, heavy grain.' }

describe('paintingPrompt', () => {
	it('puts the style first, then the brief, and asks for drama', () => {
		const prompt = paintingPrompt({
			style,
			brief: 'A review card that says "Bonjour".',
			references: 0,
		})
		expect(prompt.indexOf('Style, Risograph: Two spot inks')).toBe(0)
		expect(prompt).toContain('most dramatic')
		expect(prompt).toContain(
			'Subject and composition: A review card that says "Bonjour".'
		)
		expect(prompt.indexOf('Style,')).toBeLessThan(prompt.indexOf('Subject'))
		expect(prompt).not.toContain('reference image')
	})

	it('says what to do with one or more reference images', () => {
		expect(paintingPrompt({ style, brief: 'b', references: 1 })).toContain(
			'The reference image is a layout sketch'
		)
		expect(paintingPrompt({ style, brief: 'b', references: 3 })).toContain(
			'The 3 reference images'
		)
	})
})

describe('modelInput', () => {
	const urls = ['https://a/1', 'https://a/2']
	const base = { prompt: 'p', aspect: '4:5' as const, referenceUrls: urls }

	it('sends FLUX its references as images, at 1k', () => {
		expect(modelInput('black-forest-labs/flux-3-image-klein', base)).toEqual({
			prompt: 'p',
			aspect_ratio: '4:5',
			resolution: '1k',
			images: urls,
		})
	})

	it('sends Krea its references as image_urls, at 1K', () => {
		expect(modelInput('krea/krea-3', base)).toEqual({
			prompt: 'p',
			aspect_ratio: '4:5',
			resolution: '1K',
			image_urls: urls,
		})
	})

	it('leaves the reference list out when there is none', () => {
		expect(
			modelInput('krea/krea-3', { ...base, referenceUrls: [] })
		).not.toHaveProperty('image_urls')
	})

	it('sends Recraft no references, and the aspect as its size', () => {
		for (const model of [
			'recraft/recraftv4-1-flash',
			'recraft/recraftv4-1-vector',
		] as const) {
			expect(modelInput(model, base)).toEqual({ prompt: 'p', size: '4:5' })
		}
	})
})

describe('readModelResult', () => {
	it('reads the output schema’s bare { image }', () => {
		expect(readModelResult({ image: 'https://x/a.png' })).toEqual({
			state: 'done',
			url: 'https://x/a.png',
		})
	})

	it('reads { state, result: { image } }', () => {
		expect(
			readModelResult({
				state: 'Completed',
				result: { image: 'https://x/a.jpg' },
			})
		).toEqual({ state: 'done', url: 'https://x/a.jpg' })
	})

	it('reads BFL’s { id, status: Ready, result: { sample } }', () => {
		expect(
			readModelResult({
				id: '1867',
				status: 'Ready',
				result: { sample: 'https://x/s.jpg', seed: 1 },
				progress: null,
			})
		).toEqual({ state: 'done', url: 'https://x/s.jpg' })
	})

	it('reads Krea’s completed job, { job_id, status, result: { urls } }', () => {
		expect(
			readModelResult({
				job_id: '57b6',
				status: 'completed',
				type: 'k3',
				result: { urls: ['https://x/k.png'] },
			})
		).toEqual({ state: 'done', url: 'https://x/k.png' })
	})

	it('reads a job that is still running as pending', () => {
		expect(
			readModelResult({ job_id: '57b6', status: 'processing', result: null })
		).toEqual({ state: 'pending', pollUrl: null })
		expect(
			readModelResult({
				id: '1',
				status: 'Pending',
				polling_url: 'https://api/poll?id=1',
			})
		).toEqual({ state: 'pending', pollUrl: 'https://api/poll?id=1' })
	})

	it('reads a failed job, with its reason', () => {
		expect(
			readModelResult({ job_id: '1', status: 'failed', error: 'NSFW' })
		).toEqual({ state: 'failed', error: "The model's job failed: NSFW." })
		expect(readModelResult({ status: 'Content Moderated' }).state).toBe(
			'failed'
		)
	})

	it('reads a picture sent inline, base64 or as a data URI', () => {
		expect(readModelResult({ image: 'iVBORw0KGgo=' })).toEqual({
			state: 'inline',
			base64: 'iVBORw0KGgo=',
			contentType: '',
		})
		expect(
			readModelResult({ result: { image: 'data:image/png;base64,AAAA' } })
		).toEqual({ state: 'inline', base64: 'AAAA', contentType: 'image/png' })
	})

	it('fails on an answer with no picture', () => {
		expect(readModelResult(null).state).toBe('failed')
		expect(readModelResult({ state: 'Completed', result: {} }).state).toBe(
			'failed'
		)
		expect(readModelResult('nope').state).toBe('failed')
	})
})

const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])
const encode = (text: string) => new TextEncoder().encode(text)
const response = (body: BodyInit | null, init: ResponseInit = {}) =>
	new Response(body, init)

describe('runPainter', () => {
	it('downloads the hosted picture', async () => {
		const run = vi.fn(() =>
			Promise.resolve({
				state: 'Completed',
				result: { image: 'https://cdn/x.png' },
			})
		)
		const fetch = vi.fn((_url: string) =>
			Promise.resolve(
				response(png, { headers: { 'content-type': 'image/png' } })
			)
		)
		const painted = await runPainter(
			run,
			'recraft/recraftv4-1-flash',
			{},
			{
				fetch: fetch,
				maxBytes: 100,
			}
		)
		expect(run).toHaveBeenCalledWith('recraft/recraftv4-1-flash', {})
		expect(fetch).toHaveBeenCalledWith('https://cdn/x.png')
		expect([...painted.bytes]).toEqual([...png])
		expect(painted.contentType).toBe('image/png')
	})

	it('waits on a job at its polling_url until it is done', async () => {
		const run = vi.fn(() =>
			Promise.resolve({
				status: 'Pending',
				polling_url: 'https://api/poll',
			})
		)
		let polls = 0
		const fetch = vi.fn((url: string) => {
			if (url === 'https://api/poll') {
				polls += 1
				return Promise.resolve(
					Response.json(
						polls < 3
							? { status: 'Pending', polling_url: 'https://api/poll' }
							: { status: 'Ready', result: { sample: 'https://cdn/s.jpg' } }
					)
				)
			}
			return Promise.resolve(response(png))
		})
		const sleep = vi.fn((_ms: number) => Promise.resolve())
		const painted = await runPainter(
			run,
			'krea/krea-3',
			{},
			{
				fetch: fetch,
				sleep,
				maxBytes: 100,
			}
		)
		expect(polls).toBe(3)
		expect(sleep).toHaveBeenCalledTimes(3)
		expect(painted.url).toBe('https://cdn/s.jpg')
	})

	it('gives up on a job that outlasts the time cap', async () => {
		let clock = 0
		const fetch = vi.fn((_url: string) =>
			Promise.resolve(
				Response.json({ status: 'Pending', polling_url: 'https://api/poll' })
			)
		)
		await expect(
			runPainter(
				() =>
					Promise.resolve({
						status: 'Pending',
						polling_url: 'https://api/poll',
					}),
				'krea/krea-3',
				{},
				{
					fetch: fetch,
					sleep: (ms) => {
						clock += ms
						return Promise.resolve()
					},
					now: () => clock,
					timeoutMs: 10_000,
					maxBytes: 100,
				}
			)
		).rejects.toThrow('Krea 3 did not finish in 10 seconds.')
	})

	it('fails on a job it has no way to wait for', async () => {
		await expect(
			runPainter(
				() => Promise.resolve({ job_id: '1', status: 'queued' }),
				'krea/krea-3',
				{},
				{ maxBytes: 100 }
			)
		).rejects.toThrow('gave no way to wait for it')
	})

	it('refuses a picture bigger than the room keeps', async () => {
		const fetch = () => Promise.resolve(response(new Uint8Array(200)))
		await expect(
			runPainter(
				() => Promise.resolve({ image: 'https://cdn/big.png' }),
				'recraft/recraftv4-1-flash',
				{},
				{ fetch: fetch, maxBytes: 100 }
			)
		).rejects.toThrow('over the 0.0001 MB the room keeps')
	})

	it('decodes a picture sent inline', async () => {
		const painted = await runPainter(
			() => Promise.resolve({ image: btoa('<svg></svg>') }),
			'recraft/recraftv4-1-vector',
			{},
			{ maxBytes: 100 }
		)
		expect(new TextDecoder().decode(painted.bytes)).toBe('<svg></svg>')
		expect(painted.url).toBeNull()
	})

	it('passes on a failed job', async () => {
		await expect(
			runPainter(
				() =>
					Promise.resolve({
						status: 'Error',
						error: { message: 'bad prompt' },
					}),
				'black-forest-labs/flux-3-image-klein',
				{},
				{ maxBytes: 100 }
			)
		).rejects.toThrow("The model's job error: bad prompt.")
	})
})

describe('looksLikeSvg', () => {
	it('knows an SVG, with or without an XML declaration and DOCTYPE', () => {
		expect(looksLikeSvg(encode('<svg viewBox="0 0 1 1"></svg>'))).toBe(true)
		expect(
			looksLikeSvg(
				encode(
					'<?xml version="1.0"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x">\n<svg>'
				)
			)
		).toBe(true)
	})
	it('knows a raster image is not one', () => {
		expect(looksLikeSvg(png)).toBe(false)
		expect(looksLikeSvg(encode('<html><svg></svg></html>'))).toBe(false)
	})
})

describe('checkPaintRequest', () => {
	const known = [{ name: 'Minimalist' }, { name: 'Luxury' }]

	it('finds styles by name, ignoring case', () => {
		expect(
			checkPaintRequest({
				names: ['luxury', ' MINIMALIST '],
				known,
				left: 4,
				references: 0,
			})
		).toEqual({ ok: true, styles: [known[1], known[0]] })
	})

	it('names the styles there are when one is unknown', () => {
		const checked = checkPaintRequest({
			names: ['Vaporwave'],
			known,
			left: 4,
			references: 0,
		})
		expect(checked).toEqual({
			ok: false,
			error:
				'Nothing was painted: there is no style named Vaporwave. The styles are Minimalist, Luxury.',
		})
	})

	it('refuses more paintings than are left this hour', () => {
		expect(
			checkPaintRequest({
				names: ['Minimalist', 'Luxury'],
				known,
				left: 1,
				references: 0,
			})
		).toEqual({
			ok: false,
			error: `Nothing was painted: you can have 1 more painting this hour, out of ${PAINTINGS_PER_HOUR}.`,
		})
		expect(
			checkPaintRequest({ names: ['Luxury'], known, left: 1, references: 0 }).ok
		).toBe(true)
	})

	it('refuses too many reference images', () => {
		expect(
			checkPaintRequest({
				names: ['Luxury'],
				known,
				left: 4,
				references: MAX_PAINTER_REFERENCES + 1,
			}).ok
		).toBe(false)
	})
})

describe('DEFAULT_PAINTER_STYLES', () => {
	it('holds about ten distinct styles on known models', () => {
		const names = DEFAULT_PAINTER_STYLES.map((s) => s.name.toLowerCase())
		expect(names.length).toBeGreaterThanOrEqual(10)
		expect(new Set(names).size).toBe(names.length)
		for (const style of DEFAULT_PAINTER_STYLES) {
			expect(painterModelIds).toContain(style.model)
			expect(style.prompt.length).toBeLessThanOrEqual(2000)
			expect(style.description.length).toBeLessThanOrEqual(200)
		}
		expect(
			DEFAULT_PAINTER_STYLES.some((s) => s.model.startsWith('recraft/'))
		).toBe(true)
		expect(Object.keys(PAINTER_MODELS)).toHaveLength(4)
	})
})
