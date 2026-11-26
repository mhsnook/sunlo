import { describe, expect, it } from 'vitest'
import { imageInfo, signedImageUrl, toBase64, verifyImageLink } from './images'

const bytes = (...parts: Array<Array<number> | string>) =>
	Uint8Array.from(
		parts.flatMap((part) =>
			typeof part === 'string' ? [...part].map((c) => c.charCodeAt(0)) : part
		)
	)
const u32 = (n: number) => [n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255]
const u16 = (n: number) => [n >> 8, n & 255]

describe('imageInfo', () => {
	it('reads a PNG’s size from its header', () => {
		const png = bytes(
			[0x89],
			'PNG\r\n\x1a\n',
			u32(13),
			'IHDR',
			u32(1280),
			u32(800),
			[8, 6, 0, 0, 0]
		)
		expect(imageInfo(png)).toEqual({
			mimeType: 'image/png',
			width: 1280,
			height: 800,
		})
	})

	it('finds a JPEG’s frame after the segments before it', () => {
		const jpeg = bytes(
			[0xff, 0xd8],
			// APP0 (JFIF), 16 bytes long.
			[0xff, 0xe0],
			u16(16),
			'JFIF\0',
			[1, 1, 0, 0, 1, 0, 1, 0, 0],
			// DHT, a table in the frame markers' range.
			[0xff, 0xc4],
			u16(4),
			[0, 0],
			// SOF2 (progressive): precision, height, width.
			[0xff, 0xc2],
			u16(17),
			[8],
			u16(600),
			u16(1999),
			[3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]
		)
		expect(imageInfo(jpeg)).toEqual({
			mimeType: 'image/jpeg',
			width: 1999,
			height: 600,
		})
	})

	it('reads a GIF and a lossless WebP', () => {
		expect(imageInfo(bytes('GIF89a', [0x40, 1, 0xf0, 0], [0, 0]))).toEqual({
			mimeType: 'image/gif',
			width: 320,
			height: 240,
		})
		// 14 bits each of width - 1 (99) and height - 1 (49), after 0x2f.
		const bits = 99 | (49 << 14)
		const webp = bytes(
			'RIFF',
			[0, 0, 0, 0],
			'WEBPVP8L',
			[0, 0, 0, 0, 0x2f],
			[bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, bits >>> 24],
			[0, 0, 0, 0, 0]
		)
		expect(imageInfo(webp)).toEqual({
			mimeType: 'image/webp',
			width: 100,
			height: 50,
		})
	})

	it('refuses what is not an image', () => {
		expect(imageInfo(bytes('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(
			null
		)
		expect(imageInfo(bytes([0xff, 0xd8, 0xff]))).toBe(null)
		expect(imageInfo(new Uint8Array())).toBe(null)
	})
})

describe('toBase64', () => {
	it('encodes only the view, not the whole buffer under it', () => {
		const whole = bytes('xxhello, worldxx')
		expect(toBase64(whole.subarray(2, 14))).toBe(btoa('hello, world'))
		expect(toBase64(new Uint8Array())).toBe('')
	})
})

describe('signed image links', () => {
	const env = { IMAGE_URL_SECRET: 'a test secret' }
	const now = Date.parse('2026-10-30T12:00:00Z')
	const origin = 'https://admin.sunlo.app'

	const sign = (id: number, seconds = 600) =>
		signedImageUrl(env, { origin, id, seconds, now }).then((href) => {
			const url = new URL(href)
			return {
				url,
				expires: url.searchParams.get('expires') ?? undefined,
				sig: url.searchParams.get('sig') ?? undefined,
			}
		})

	it('signs a link to the public image route that verifies', async () => {
		const { url, expires, sig } = await sign(12)
		expect(url.origin + url.pathname).toBe(
			'https://admin.sunlo.app/api/public/images/12'
		)
		expect(Number(expires)).toBe(now / 1000 + 600)
		expect(
			await verifyImageLink(env.IMAGE_URL_SECRET, { id: 12, expires, sig, now })
		).toBe(true)
	})

	it('refuses a wrong signature', async () => {
		const { expires, sig = '' } = await sign(12)
		const flipped = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)
		const verdicts = await Promise.all(
			[flipped, 'not base64!', '', undefined].map((bad) =>
				verifyImageLink(env.IMAGE_URL_SECRET, {
					id: 12,
					expires,
					sig: bad,
					now,
				})
			)
		)
		expect(verdicts).toEqual([false, false, false, false])
		expect(
			await verifyImageLink('another secret', { id: 12, expires, sig, now })
		).toBe(false)
		expect(
			await verifyImageLink(undefined, { id: 12, expires, sig, now })
		).toBe(false)
	})

	it('refuses, without throwing, a signature that is not whole base64url', async () => {
		const { expires, sig = '' } = await sign(12)
		const malformed = [
			'A',
			'AB',
			'ABCDE',
			sig.slice(0, -1),
			`${sig}=`,
			`${sig}A`,
		]
		const verdicts = await Promise.all(
			malformed.map((bad) =>
				verifyImageLink(env.IMAGE_URL_SECRET, {
					id: 12,
					expires,
					sig: bad,
					now,
				})
			)
		)
		expect(verdicts).toEqual(malformed.map(() => false))
	})

	it('refuses a link after it expires, or with its expiry changed', async () => {
		const { expires, sig } = await sign(12, 60)
		const check = (input: { expires?: string; now: number }) =>
			verifyImageLink(env.IMAGE_URL_SECRET, {
				id: 12,
				sig,
				expires: input.expires,
				now: input.now,
			})
		expect(await check({ expires, now: now + 59_000 })).toBe(true)
		expect(await check({ expires, now: now + 60_000 })).toBe(false)
		expect(await check({ expires: String(Number(expires) + 3600), now })).toBe(
			false
		)
		expect(await check({ expires: '1e12', now })).toBe(false)
	})

	it('refuses a signature for another image', async () => {
		const { expires, sig } = await sign(12)
		expect(
			await verifyImageLink(env.IMAGE_URL_SECRET, { id: 13, expires, sig, now })
		).toBe(false)
	})

	it('fails to sign, and says why, without the secret', async () => {
		await expect(signedImageUrl({}, { origin, id: 12 })).rejects.toThrow(
			'IMAGE_URL_SECRET is not set'
		)
		await expect(
			signedImageUrl(env, { origin, id: 12, seconds: 2 * 86_400 })
		).rejects.toThrow('from 1 to 86400 seconds')
	})
})
