import { createAgentRouter } from '@flue/runtime/routing'
import { z } from 'zod'
import { crewKeys, isCrewKey, RoutingSchema } from '../shared/crew'
import { createApi } from '../worker/api'
import { Product } from './agents/product'
import { deliver, roomFor, wake } from './crew'

// worker/api.ts checks the admin on every /api route except /api/crew/live,
// which checks a ticket instead. These routes add the crew room and the
// agents to that app.

const api = createApi()

const PostSchema = z.object({
	body: z.string().trim().min(1).max(8000),
	routing: RoutingSchema.nullable().optional(),
	predicted: RoutingSchema.nullable().optional(),
})

api.get('/crew/room', async (c) => {
	return c.json(await roomFor(c.env).snapshot(c.get('admin').uid))
})

api.post('/crew/seen', async (c) => {
	await roomFor(c.env).markSeen(c.get('admin').uid)
	return c.json({ ok: true })
})

api.post('/crew/clef', async (c) => {
	const body = z
		.object({ text: z.string().trim().min(1).max(8000) })
		.safeParse(await c.req.json().catch(() => null))
	if (!body.success) return c.json({ error: 'Send { text }' }, 400)
	return c.json(await roomFor(c.env).classify(body.data.text))
})

api.post('/crew/messages', async (c) => {
	const input = PostSchema.safeParse(await c.req.json().catch(() => null))
	if (!input.success) {
		return c.json({ error: 'Send { body, routing?, predicted? }' }, 400)
	}
	const admin = c.get('admin')
	const { message, wake: wakes } = await roomFor(c.env).postFromAdmin({
		uid: admin.uid,
		name: admin.name,
		body: input.data.body,
		routing: input.data.routing ?? null,
		predicted: input.data.predicted ?? null,
	})
	await wake(wakes, admin.name)
	return c.json(message)
})

api.post('/crew/messages/:id/answer', async (c) => {
	const input = z
		.object({ actionId: z.string().min(1) })
		.safeParse(await c.req.json().catch(() => null))
	if (!input.success) return c.json({ error: 'Send { actionId }' }, 400)
	const room = roomFor(c.env)
	const result = await room.answer({
		messageId: c.req.param('id'),
		actionId: input.data.actionId,
		name: c.get('admin').name,
	})
	if (!result.ok) return c.json({ error: result.error }, result.status)
	if (result.conversation === 'team') await room.markWorking(result.agent)
	await deliver(result.agent, result.conversation, 'crew.answer', result.body)
	return c.json({ ok: true })
})

api.get('/crew/agents/:agent', async (c) => {
	const agent = c.req.param('agent')
	if (!isCrewKey(agent)) {
		return c.json({ error: `Crew members are ${crewKeys.join(', ')}` }, 404)
	}
	return c.json(await roomFor(c.env).workspace(agent))
})

api.post('/crew/ticket', async (c) => {
	return c.json({
		ticket: await roomFor(c.env).issueTicket(c.get('admin').uid),
	})
})

api.get('/crew/live', (c) => roomFor(c.env).fetch(c.req.raw))

// A 1:1 chat with an agent is the conversation "dm-<admin uid>", so an admin
// can only open their own. Room runs use the conversation "team", which is
// dispatch-only.
api.use('/agents/*', async (c, next) => {
	// /api/agents/<agent>/<conversation>[/...]
	const conversation = c.req.path.split('/')[4]
	if (conversation !== `dm-${c.get('admin').uid}`) {
		return c.json({ error: 'Open your own chat: dm-<your user id>' }, 403)
	}
	return next()
})
api.route('/agents/product', createAgentRouter(Product))

export default api
