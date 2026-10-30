import { MAX_IMAGE_BYTES, MAX_IMAGE_SIDE } from '../../shared/crew'

// Smaller sides to try, in turn, when even a JPEG is too big.
const SHRINK_STEPS = [1, 0.75, 0.5, 0.35]
const JPEG_QUALITIES = [0.9, 0.8, 0.7]

type Encoding = {
	step: number
	type: 'image/png' | 'image/jpeg'
	quality: number | undefined
}

export function encodingPlan(sourceType: string): Array<Encoding> {
	const jpegs = SHRINK_STEPS.flatMap((step) =>
		JPEG_QUALITIES.map((quality) => ({
			step,
			type: 'image/jpeg' as const,
			quality,
		}))
	)
	return sourceType === 'image/png'
		? [{ step: 1, type: 'image/png', quality: undefined }, ...jpegs]
		: jpegs
}

// A picture the room can keep: at most MAX_IMAGE_SIDE pixels on its long
// side, and under MAX_IMAGE_BYTES. PNG if the source is one and that fits,
// otherwise JPEG.
export async function shrinkImage(
	file: Blob
): Promise<{ blob: Blob; width: number; height: number }> {
	const bitmap = await createImageBitmap(file)
	const fit = Math.min(
		1,
		MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height)
	)
	const plan = encodingPlan(file.type)
	const attempt = async (
		index: number
	): Promise<{ blob: Blob; width: number; height: number }> => {
		const next = plan.at(index)
		if (!next)
			throw new Error('That image is too big to send, even scaled down')
		const width = Math.max(1, Math.round(bitmap.width * fit * next.step))
		const height = Math.max(1, Math.round(bitmap.height * fit * next.step))
		const blob = await encode(bitmap, width, height, next.type, next.quality)
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

// Uploads each draft image once, by its key: a send that fails after some
// uploads went through reuses them when the admin sends again. A failed
// upload is not remembered, so the next send tries it again.
export function uploadOnce<T>(upload: (blob: Blob) => Promise<T>) {
	const stored = new Map<string, Promise<T>>()
	return {
		upload: (image: { key: string; blob: Blob }) => {
			const known = stored.get(image.key)
			if (known) return known
			const pending = upload(image.blob).catch((error: unknown) => {
				stored.delete(image.key)
				throw error
			})
			stored.set(image.key, pending)
			return pending
		},
		forget: (keys: Iterable<string>) => {
			for (const key of keys) stored.delete(key)
		},
	}
}
