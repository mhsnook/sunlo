import { describe, expect, it, vi } from 'vitest'
import { encodingPlan, uploadOnce } from './images'

describe('encodingPlan', () => {
	it('tries a PNG source as a PNG at full size only, then as JPEG', () => {
		const plan = encodingPlan('image/png')
		expect(plan[0]).toEqual({ step: 1, type: 'image/png', quality: undefined })
		expect(
			plan.filter((encoding) => encoding.type === 'image/png')
		).toHaveLength(1)
		expect(
			plan.slice(1).every((encoding) => encoding.type === 'image/jpeg')
		).toBe(true)
	})

	it('tries any other source as JPEG only', () => {
		for (const type of ['image/jpeg', 'image/webp', 'image/gif', '']) {
			expect(
				encodingPlan(type).every((encoding) => encoding.type === 'image/jpeg')
			).toBe(true)
		}
	})

	it('goes down in quality before it goes down in size', () => {
		const plan = encodingPlan('image/jpeg')
		expect(plan.slice(0, 4)).toEqual([
			{ step: 1, type: 'image/jpeg', quality: 0.9 },
			{ step: 1, type: 'image/jpeg', quality: 0.8 },
			{ step: 1, type: 'image/jpeg', quality: 0.7 },
			{ step: 0.75, type: 'image/jpeg', quality: 0.9 },
		])
	})
})

const image = (key: string) => ({ key, blob: new Blob([key]) })

describe('uploadOnce', () => {
	it('uploads an image once, and reuses it on the next send', async () => {
		let next = 1
		const upload = vi.fn(() => Promise.resolve({ id: next++ }))
		const uploads = uploadOnce(upload)
		const first = await Promise.all(
			[image('a'), image('b')].map(uploads.upload)
		)
		const again = await Promise.all(
			[image('a'), image('b'), image('c')].map(uploads.upload)
		)
		expect(first).toEqual([{ id: 1 }, { id: 2 }])
		expect(again).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
		expect(upload).toHaveBeenCalledTimes(3)
	})

	it('tries a failed upload again, and keeps the ones that went through', async () => {
		const upload = vi
			.fn<(blob: Blob) => Promise<{ id: number }>>()
			.mockResolvedValueOnce({ id: 1 })
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValueOnce({ id: 2 })
		const uploads = uploadOnce(upload)
		const send = () => Promise.all([image('a'), image('b')].map(uploads.upload))
		await expect(send()).rejects.toThrow('offline')
		expect(await send()).toEqual([{ id: 1 }, { id: 2 }])
		expect(upload).toHaveBeenCalledTimes(3)
	})

	it('uploads again after it forgets a key', async () => {
		let next = 1
		const uploads = uploadOnce(() => Promise.resolve({ id: next++ }))
		await uploads.upload(image('a'))
		uploads.forget(['a'])
		expect(await uploads.upload(image('a'))).toEqual({ id: 2 })
	})
})
