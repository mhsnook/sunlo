import type { MiddlewareHandler } from 'hono'
import { COACH_MOUNT } from '../src/features/coach/protocol'
import type { AppEnv } from './auth'

// A message to the coach is a few lines of page context and what the learner
// typed. Larger bodies are refused before they reach the model.
const MAX_MESSAGE_BYTES = 16_000

// Flue's router has no auth of its own: anyone who can reach a conversation
// URL can read and write it. Runs after requireUser, and lets a learner reach
// only their own conversation, whose id is their uid.
export const requireOwnConversation: MiddlewareHandler<AppEnv> = async (
	c,
	next
) => {
	const id = c.req.path.slice(COACH_MOUNT.length + 1).split('/')[0]
	if (id !== c.get('uid'))
		return c.json({ error: 'Not your conversation' }, 403)
	if (c.req.method === 'POST' && !c.req.path.endsWith('/abort')) {
		const length = Number(c.req.header('content-length'))
		if (!length) return c.json({ error: 'Send the message with a length' }, 411)
		if (length > MAX_MESSAGE_BYTES)
			return c.json({ error: 'That message is too long for the coach' }, 413)
		const { success } = await c.env.COACH_LIMITER.limit({ key: c.get('uid') })
		if (!success)
			return c.json(
				{ error: 'The coach needs a short break. Wait a minute.' },
				429
			)
	}
	return next()
}
