import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE } from '../../shared/crew'

// Smaller sides to try, in turn, when even a JPEG is too big.
const SHRINK_STEPS = [1, 0.75, 0.5, 0.35]
const ENCODINGS = [
	{ type: 'image/png', quality: undefined },
	{ type: 'image/jpeg', quality: 0.9 },
	{ type: 'image/jpeg', quality: 0.8 },
	{ type: 'image/jpeg', quality: 0.7 },
] as const

// A picture the room can keep: at most MAX_IMAGE_SIDE pixels on its long
// side, and under MAX_IMAGE_BYTES. PNG if that fits, otherwise JPEG.
export async function shrinkImage(
	file: Blob
): Promise<{ blob: Blob; width: number; height: number }> {
	const bitmap = await createImageBitmap(file)
	const fit = Math.min(
		1,
		MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height)
	)
	const tries = SHRINK_STEPS.flatMap((step) =>
		ENCODINGS.map((encoding) => ({ step, encoding }))
	)
	// One encoding at a time, until one fits.
	const attempt = async (
		index: number
	): Promise<{ blob: Blob; width: number; height: number }> => {
		const next = tries.at(index)
		if (!next)
			throw new Error('That image is too big to send, even scaled down')
		const width = Math.max(1, Math.round(bitmap.width * fit * next.step))
		const height = Math.max(1, Math.round(bitmap.height * fit * next.step))
		const { type, quality } = next.encoding
		const blob = await encode(bitmap, width, height, type, quality)
		return blob.size <= MAX_IMAGE_BYTES
			? { blob, width, height }
			: attempt(index + 1)
	}
	try {
		return await attempt(0)
	} finally {
		bitmap.close()
	}
}

// The clipboard takes images as PNG only, so a JPEG or WebP painting is
// redrawn as one before it is copied.
export async function asPng(blob: Blob): Promise<Blob> {
	if (blob.type === 'image/png') return blob
	const bitmap = await createImageBitmap(blob)
	try {
		return await encode(bitmap, bitmap.width, bitmap.height, 'image/png')
	} finally {
		bitmap.close()
	}
}

function encode(
	bitmap: ImageBitmap,
	width: number,
	height: number,
	type: 'image/png' | 'image/jpeg',
	quality?: number
) {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const context = canvas.getContext('2d')
	if (!context) throw new Error('This browser cannot draw the image')
	// A JPEG has no transparency, and a transparent pixel would turn black.
	if (type === 'image/jpeg') {
		context.fillStyle = '#fff'
		context.fillRect(0, 0, width, height)
	}
	context.drawImage(bitmap, 0, 0, width, height)
	return new Promise<Blob>((resolve, reject) =>
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error('Could not encode the image')),
			type,
			quality
		)
	)
}
