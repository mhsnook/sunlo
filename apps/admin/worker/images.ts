import { Buffer } from 'node:buffer'
import type { ImageMimeType } from '../shared/crew'

export type ImageInfo = {
	mimeType: ImageMimeType
	width: number
	height: number
}

const sized = (mimeType: ImageMimeType, width: number, height: number) =>
	width > 0 && height > 0 ? { mimeType, width, height } : null

// The type and size an image's own bytes declare, or null for anything that
// is not a PNG, JPEG, WebP or GIF. The room trusts these, not the upload's
// content-type header.
export function imageInfo(bytes: Uint8Array): ImageInfo | null {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
	const ascii = (at: number, length: number) =>
		at + length <= bytes.length
			? String.fromCharCode(...bytes.subarray(at, at + length))
			: ''

	if (ascii(1, 3) === 'PNG' && ascii(12, 4) === 'IHDR' && bytes.length >= 24) {
		return sized('image/png', view.getUint32(16), view.getUint32(20))
	}
	if (
		(ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') &&
		bytes.length >= 10
	) {
		return sized('image/gif', view.getUint16(6, true), view.getUint16(8, true))
	}
	if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP' && bytes.length >= 30) {
		const chunk = ascii(12, 4)
		if (chunk === 'VP8 ') {
			return sized(
				'image/webp',
				view.getUint16(26, true) & 0x3fff,
				view.getUint16(28, true) & 0x3fff
			)
		}
		if (chunk === 'VP8L') {
			const bits = view.getUint32(21, true)
			return sized(
				'image/webp',
				(bits & 0x3fff) + 1,
				((bits >> 14) & 0x3fff) + 1
			)
		}
		if (chunk === 'VP8X') {
			const uint24 = (at: number) =>
				bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)
			return sized('image/webp', uint24(24) + 1, uint24(27) + 1)
		}
		return null
	}
	if (bytes[0] === 0xff && bytes[1] === 0xd8) return jpegInfo(bytes, view)
	return null
}

// A JPEG's size is in its first start-of-frame segment, which can come after
// any number of other segments (EXIF, colour profiles, tables).
function jpegInfo(bytes: Uint8Array, view: DataView): ImageInfo | null {
	let at = 2
	while (at + 9 < bytes.length) {
		if (bytes[at] !== 0xff) return null
		const marker = bytes[at + 1]
		if (marker === 0xff) {
			at += 1
			continue
		}
		// Markers with no length after them.
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
			at += 2
			continue
		}
		// C4, C8 and CC share the range but are tables, not frames.
		const frame =
			marker >= 0xc0 &&
			marker <= 0xcf &&
			marker !== 0xc4 &&
			marker !== 0xc8 &&
			marker !== 0xcc
		if (frame) {
			const height = view.getUint16(at + 5)
			const width = view.getUint16(at + 7)
			return sized('image/jpeg', width, height)
		}
		at += 2 + view.getUint16(at + 2)
	}
	return null
}

export const toBase64 = (bytes: Uint8Array) =>
	Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
		'base64'
	)

// ---- Signed links ---------------------------------------------------------

// Image models on Cloudflare fetch a reference image from a URL, without the
// admin's token. A signed link serves one image until it expires: an
// HMAC-SHA256 of the image id and the expiry, keyed with IMAGE_URL_SECRET.

export const PUBLIC_IMAGE_PATH = '/api/public/images'
const DEFAULT_LINK_SECONDS = 15 * 60
export const MAX_LINK_SECONDS = 24 * 60 * 60

const encoder = new TextEncoder()
const signedText = (id: number, expires: number) => `image:${id}:${expires}`

const hmacKey = (secret: string) =>
	crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	)

// A link to one image that works without a token until it expires.
// `origin` is the admin app's, such as https://admin.sunlo.app.
export async function signedImageUrl(
	env: { IMAGE_URL_SECRET?: string },
	input: { origin: string; id: number; seconds?: number; now?: number }
) {
	const secret = env.IMAGE_URL_SECRET
	if (!secret) {
		throw new Error(
			'IMAGE_URL_SECRET is not set, so the Worker cannot sign image links. Set it with `wrangler secret put IMAGE_URL_SECRET`, or in .dev.vars locally.'
		)
	}
	const seconds = input.seconds ?? DEFAULT_LINK_SECONDS
	if (!(seconds > 0 && seconds <= MAX_LINK_SECONDS)) {
		throw new Error(
			`A signed image link lasts from 1 to ${MAX_LINK_SECONDS} seconds.`
		)
	}
	const expires = Math.floor((input.now ?? Date.now()) / 1000) + seconds
	const signature = await crypto.subtle.sign(
		'HMAC',
		await hmacKey(secret),
		encoder.encode(signedText(input.id, expires))
	)
	const url = new URL(`${PUBLIC_IMAGE_PATH}/${input.id}`, input.origin)
	url.searchParams.set('expires', String(expires))
	url.searchParams.set('sig', Buffer.from(signature).toString('base64url'))
	return url.href
}

// True only for a signature the secret made for this id and expiry, before
// it expires. Without the secret, no link is valid.
export async function verifyImageLink(
	secret: string | undefined,
	input: {
		id: number
		expires: string | undefined
		sig: string | undefined
		now?: number
	}
) {
	if (!secret || !input.sig || !input.expires) return false
	if (!/^\d{1,12}$/.test(input.expires)) return false
	const expires = Number(input.expires)
	if (expires * 1000 <= (input.now ?? Date.now())) return false
	// Buffer skips characters outside the alphabet instead of refusing them.
	if (!/^[A-Za-z0-9_-]+$/.test(input.sig)) return false
	// subtle.verify compares in constant time, and answers false for a
	// signature of the wrong length.
	return crypto.subtle.verify(
		'HMAC',
		await hmacKey(secret),
		Buffer.from(input.sig, 'base64url'),
		encoder.encode(signedText(input.id, expires))
	)
}
