import { describe, expect, it, vi } from 'vitest'
import { createGuestNameClaim, type GuestNameClaimIo } from './guest-name-claim'

const uid = 'f3a1c2d4-0000-4000-8000-000000000001'

function setup(overrides: Partial<GuestNameClaimIo> = {}) {
	const user = {
		id: uid,
		is_anonymous: true,
		user_metadata: { username: 'GuestLearner' } as Record<string, unknown>,
	}
	const io = {
		currentUser: vi.fn(() => Promise.resolve(user)),
		profileUsername: vi.fn((): string | null => null),
		writeUsername: vi.fn(() => Promise.resolve()),
		clearPendingName: vi.fn(() => Promise.resolve()),
		nameTaken: vi.fn(),
		writeFailed: vi.fn(),
		...overrides,
	}
	return { user, io, claim: createGuestNameClaim(io) }
}

describe('createGuestNameClaim', () => {
	it('waits while the user is a guest, then writes once they confirm', async () => {
		const { user, io, claim } = setup()
		await claim(uid)
		expect(io.writeUsername).not.toHaveBeenCalled()

		user.is_anonymous = false
		await claim(uid)
		expect(io.writeUsername).toHaveBeenCalledWith(uid, 'GuestLearner')
		expect(io.clearPendingName).toHaveBeenCalledOnce()
	})

	it('runs once per user in a tab', async () => {
		const { user, io, claim } = setup()
		user.is_anonymous = false
		await Promise.all([claim(uid), claim(uid)])
		await claim(uid)
		expect(io.writeUsername).toHaveBeenCalledOnce()
	})

	it('checks an account without a pending name only once', async () => {
		const { user, io, claim } = setup()
		user.is_anonymous = false
		user.user_metadata = {}
		await claim(uid)
		await claim(uid)
		expect(io.currentUser).toHaveBeenCalledOnce()
		expect(io.writeUsername).not.toHaveBeenCalled()
		expect(io.clearPendingName).not.toHaveBeenCalled()
	})

	it('clears the pending name only after the write succeeds', async () => {
		const order: Array<string> = []
		const { user, claim } = setup({
			writeUsername: vi.fn(() => Promise.resolve(void order.push('write'))),
			clearPendingName: vi.fn(() => Promise.resolve(void order.push('clear'))),
		})
		user.is_anonymous = false
		await claim(uid)
		expect(order).toEqual(['write', 'clear'])
	})

	it('reports a taken name and stops trying', async () => {
		const { user, io, claim } = setup({
			writeUsername: vi.fn(() =>
				Promise.reject(
					Object.assign(new Error('duplicate key'), { code: '23505' })
				)
			),
		})
		user.is_anonymous = false
		await claim(uid)
		await claim(uid)
		expect(io.nameTaken).toHaveBeenCalledExactlyOnceWith('GuestLearner')
		expect(io.writeFailed).not.toHaveBeenCalled()
		expect(io.clearPendingName).toHaveBeenCalledOnce()
		expect(io.writeUsername).toHaveBeenCalledOnce()
	})

	it('keeps the name and retries after any other failure', async () => {
		const failure = Object.assign(new Error('Failed to fetch'), { code: '' })
		const writeUsername = vi
			.fn<GuestNameClaimIo['writeUsername']>()
			.mockRejectedValueOnce(failure)
			.mockResolvedValueOnce(undefined)
		const { user, io, claim } = setup({ writeUsername })
		user.is_anonymous = false

		await claim(uid)
		expect(io.writeFailed).toHaveBeenCalledWith(failure)
		expect(io.nameTaken).not.toHaveBeenCalled()
		expect(io.clearPendingName).not.toHaveBeenCalled()

		await claim(uid)
		expect(writeUsername).toHaveBeenCalledTimes(2)
		expect(io.clearPendingName).toHaveBeenCalledOnce()
	})

	it('leaves a profile that already has a username, and clears the pending name', async () => {
		const { user, io, claim } = setup({ profileUsername: () => 'ChosenLater' })
		user.is_anonymous = false
		await claim(uid)
		expect(io.writeUsername).not.toHaveBeenCalled()
		expect(io.clearPendingName).toHaveBeenCalledOnce()
	})

	it('ignores a session that belongs to someone else', async () => {
		const { user, io, claim } = setup()
		user.is_anonymous = false
		await claim('f3a1c2d4-0000-4000-8000-000000000002')
		expect(io.writeUsername).not.toHaveBeenCalled()
	})
})
