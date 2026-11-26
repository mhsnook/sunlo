import { describe, expect, it } from 'vitest'
import { planReply, THREAD_REPLIES } from './threads'

const thread = {
	asker: 'command-1' as const,
	helper: 'product-1' as const,
	closedAt: null,
	replies: 0,
	close: false,
}

describe('planReply', () => {
	it('lets only the two agents in the thread reply', () => {
		expect(planReply({ ...thread, agent: 'command-2' })).toEqual({
			ok: false,
			error: 'That side-thread is not yours.',
		})
	})

	it('refuses a reply in a closed thread', () => {
		expect(
			planReply({ ...thread, agent: 'product-1', closedAt: '2026-10-29' })
		).toMatchObject({ ok: false })
	})

	it("wakes the asker for the helper's reply, even the one that closes it", () => {
		expect(planReply({ ...thread, agent: 'product-1' })).toEqual({
			ok: true,
			closing: false,
			wakes: 'asker',
		})
		expect(planReply({ ...thread, agent: 'product-1', close: true })).toEqual({
			ok: true,
			closing: true,
			wakes: 'asker',
		})
	})

	it("wakes the helper for the asker's reply, but not once it closes", () => {
		expect(planReply({ ...thread, agent: 'command-1' })).toMatchObject({
			wakes: 'helper',
		})
		expect(planReply({ ...thread, agent: 'command-1', close: true })).toEqual({
			ok: true,
			closing: true,
			wakes: null,
		})
	})

	it('closes the thread at its last allowed reply', () => {
		expect(
			planReply({
				...thread,
				agent: 'command-1',
				replies: THREAD_REPLIES - 1,
			})
		).toEqual({ ok: true, closing: true, wakes: null })
	})
})
