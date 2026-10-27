import { createAgentRouter } from '@flue/runtime/routing'
import { z } from 'zod'
import {
	crewKeys,
	isCrewKey,
	RoutingSchema,
	type StackItemType,
} from '../shared/crew'
import { createApi } from '../worker/api'
import { Data } from './agents/data'
import { Product } from './agents/product'
import { Riker } from './agents/riker'
import { deliver, roomFor, wake } from './crew'

// worker/api.ts checks the admin on every /api route. These routes add the
// crew room and the agents to that app.

const api = createApi()

const PostSchema = z.object({
	body: z.string().trim().min(1).max(8000),
	routing: RoutingSchema.nullable().optional(),
	predicted: RoutingSchema.nullable().optional(),
})

api.get('/crew/room', async (c) => {
	return c.json(await (await roomFor(c.env)).snapshot(c.get('admin').uid))
})

api.post('/crew/seen', async (c) => {
	await (await roomFor(c.env)).markSeen(c.get('admin').uid)
	return c.json({ ok: true })
})

api.post('/crew/clef', async (c) => {
	const body = z
		.object({ text: z.string().trim().min(1).max(8000) })
		.safeParse(await c.req.json().catch(() => null))
	if (!body.success) return c.json({ error: 'Send { text }' }, 400)
	return c.json(await (await roomFor(c.env)).classify(body.data.text))
})

api.post('/crew/messages', async (c) => {
	const input = PostSchema.safeParse(await c.req.json().catch(() => null))
	if (!input.success) {
		return c.json({ error: 'Send { body, routing?, predicted? }' }, 400)
	}
	const admin = c.get('admin')
	const { message, wake: wakes } = await (
		await roomFor(c.env)
	).postFromAdmin({
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
	const room = await roomFor(c.env)
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

api.post('/crew/messages/:id/correct', async (c) => {
	const input = z
		.object({ routing: RoutingSchema })
		.safeParse(await c.req.json().catch(() => null))
	if (!input.success) return c.json({ error: 'Send { routing }' }, 400)
	const admin = c.get('admin')
	const result = await (
		await roomFor(c.env)
	).correct({
		messageId: c.req.param('id'),
		uid: admin.uid,
		routing: input.data.routing,
	})
	if (!result.ok) return c.json({ error: result.error }, result.status)
	await wake(result.wake, admin.name)
	return c.json(result.message)
})

api.get('/crew/agents/:agent', async (c) => {
	const agent = c.req.param('agent')
	if (!isCrewKey(agent)) {
		return c.json({ error: `Crew members are ${crewKeys.join(', ')}` }, 404)
	}
	return c.json(await (await roomFor(c.env)).workspace(agent))
})

api.delete('/crew/agents/:agent/memory/:id', async (c) => {
	const agent = c.req.param('agent')
	const id = z.coerce.number().int().safeParse(c.req.param('id'))
	if (!isCrewKey(agent) || !id.success) {
		return c.json({ error: 'No memory there' }, 404)
	}
	const ok = await (await roomFor(c.env)).forget(agent, id.data)
	return ok ? c.json({ ok }) : c.json({ error: 'No memory with that id' }, 404)
})

api.get('/crew/stack', async (c) => {
	return c.json(await (await roomFor(c.env)).stack())
})

// Answers to these wake the agent who asked; a "know" item or a brief only
// leaves the stack.
const answered = new Set<StackItemType['kind']>([
	'decide',
	'confirm',
	'escalate',
	'charter',
])

api.post('/crew/stack/:id/answer', async (c) => {
	const input = z
		.object({
			actionId: z.string().min(1),
			note: z.string().trim().max(2000).nullable().optional(),
		})
		.safeParse(await c.req.json().catch(() => null))
	const id = z.coerce.number().int().safeParse(c.req.param('id'))
	if (!input.success || !id.success) {
		return c.json(
			{ error: 'Send { actionId, note? } to a numeric item id' },
			400
		)
	}
	const room = await roomFor(c.env)
	const item = (await room.stack()).items.find((i) => i.id === id.data)
	const result = await room.answerStack({
		id: id.data,
		actionId: input.data.actionId,
		note: input.data.note || null,
		name: c.get('admin').name,
	})
	if (!result.ok) return c.json({ error: result.error }, result.status)
	if (item && answered.has(item.kind)) {
		await room.markWorking(result.author)
		await deliver(result.author, 'team', 'crew.answer', result.body)
	}
	return c.json({ ok: true })
})

api.patch('/crew/charter/:id', async (c) => {
	const input = z
		.object({
			text: z.string().trim().min(1).max(300).optional(),
			status: z.enum(['kept', 'dropped']).optional(),
		})
		.safeParse(await c.req.json().catch(() => null))
	const id = z.coerce.number().int().safeParse(c.req.param('id'))
	if (!input.success || !id.success) {
		return c.json(
			{ error: 'Send { text?, status? } to a numeric entry id' },
			400
		)
	}
	const ok = await (await roomFor(c.env)).editCharter(id.data, input.data)
	return ok
		? c.json({ ok })
		: c.json({ error: 'No charter entry with that id' }, 404)
})

api.put('/crew/weekly/timezone', async (c) => {
	const input = z
		.object({ timezone: z.string().min(1) })
		.safeParse(await c.req.json().catch(() => null))
	if (!input.success || !isTimeZone(input.data.timezone)) {
		return c.json(
			{ error: 'Send an IANA time zone, like America/New_York' },
			400
		)
	}
	await (await roomFor(c.env)).setTimezone(input.data.timezone)
	return c.json({ ok: true })
})

// The room's WebSocket, opened by useAgent. worker/api.ts has checked the
// admin, from the token in the query string.
api.get('/crew/live', async (c) => (await roomFor(c.env)).fetch(c.req.raw))

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
api.route('/agents/riker', createAgentRouter(Riker))
api.route('/agents/data', createAgentRouter(Data))
api.route('/agents/product', createAgentRouter(Product))

export default api

function isTimeZone(timezone: string) {
	try {
		return !!new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
		}).resolvedOptions().timeZone
	} catch {
		return false
	}
}
