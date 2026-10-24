import { describe, expect, it } from 'vitest'
import { withDeadline } from './db'

describe('withDeadline', () => {
	it('passes a value through when the promise settles in time', async () => {
		await expect(
			withDeadline(Promise.resolve(1), 50, 'The database')
		).resolves.toBe(1)
	})

	it('rejects with the original error when the promise fails in time', async () => {
		await expect(
			withDeadline(
				Promise.reject(new Error('bad password')),
				50,
				'The database'
			)
		).rejects.toThrow('bad password')
	})

	it('rejects with a named timeout when the promise never settles', async () => {
		await expect(
			withDeadline(new Promise(() => {}), 10, 'The database')
		).rejects.toThrow('The database did not answer within 0.01s')
	})
})
