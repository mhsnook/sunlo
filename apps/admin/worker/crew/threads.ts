import type { CrewKey } from '../../shared/crew'

// A side-thread closes itself after this many replies.
export const THREAD_REPLIES = 10

export type ReplyPlan =
	| { ok: true; closing: boolean; wakes: 'asker' | 'helper' | null }
	| { ok: false; error: string }

// Who may reply in a side-thread, whether the reply closes it, and who hears
// it. The asker hears every reply from the helper, the one that closes the
// thread too; the helper hears the asker only while the thread stays open.
export function planReply(input: {
	agent: CrewKey
	asker: CrewKey
	helper: CrewKey
	closedAt: string | null
	// Replies so far, receipts left out.
	replies: number
	close: boolean
}): ReplyPlan {
	const { agent, asker, helper } = input
	if (agent !== asker && agent !== helper) {
		return { ok: false, error: 'That side-thread is not yours.' }
	}
	if (input.closedAt) return { ok: false, error: 'That side-thread is closed.' }
	const closing = input.close || input.replies + 1 >= THREAD_REPLIES
	return {
		ok: true,
		closing,
		wakes: agent === helper ? 'asker' : closing ? null : 'helper',
	}
}
