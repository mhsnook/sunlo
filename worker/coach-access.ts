import type { MiddlewareHandler } from 'hono'
import {
	COACH_MOUNT,
	parseCoachConversationId,
} from '../src/features/coach/protocol'
import type { AppEnv } from './auth'

// Flue's router has no auth of its own: anyone who can reach a conversation
// URL can read and write it. Runs after requireUser, and lets a learner
// reach only conversations whose id carries their own uid.
export const requireOwnConversation: MiddlewareHandler<AppEnv> = async (
	c,
	next
) => {
	const id = c.req.path.slice(COACH_MOUNT.length + 1).split('/')[0]
	if (parseCoachConversationId(id)?.uid !== c.get('uid'))
		return c.json({ error: 'Not your conversation' }, 403)
	if (c.req.method === 'POST' && !c.req.path.endsWith('/abort')) {
		const { success } = await c.env.COACH_LIMITER.limit({ key: c.get('uid') })
		if (!success)
			return c.json(
				{ error: 'The coach needs a short break. Wait a minute.' },
				429
			)
	}
	return next()
}
