import { createAgentRouter } from '@flue/runtime/routing'
import { validator } from 'hono/validator'
import { z } from 'zod'
import { crewKeys, fleetKeys, isCrewKey, RoutingSchema } from '../shared/crew'
import { createApi } from '../worker/api'
import { crewAgents, deliver, requestReport, roomFor, wake } from './crew'

// worker/api.ts checks the admin on every /api route. These routes add the
// crew room and the agents to that app.

const api = createApi()

// A JSON body that fails its schema answers 400, and an :id that is not a
// number 404, with `error`.
const json = <S extends z.ZodType>(schema: S, error: string) =>
	validator('json', (value, c) => {
		const parsed = schema.safeParse(value)
		return parsed.success ? parsed.data : c.json({ error }, 400)
	})
const numericId = (error: string) =>
	validator('param', (value, c) => {
		const id = z.coerce.number().int().safeParse(value.id)
		return id.success ? { id: id.data } : c.json({ error }, 404)
	})

const Text = z.string().trim().min(1).max(8000)

api.get('/crew/room', async (c) => {
	return c.json(await (await roomFor()).snapshot(c.get('admin').uid))
})

api.post(
	'/crew/seen',
	json(z.object({ place: z.enum(['room', 'bridge']) }), 'Send { place }'),
	async (c) => {
		await (
			await roomFor()
		).markSeen(c.get('admin').uid, c.req.valid('json').place)
		return c.json({ ok: true })
	}
)

api.post(
	'/crew/messages',
	json(
		z.object({
			body: Text,
			// The place the admin picked from the chip, or null for CLEF.
			routing: RoutingSchema.nullable(),
		}),
		'Send { body, routing }'
	),
	async (c) => {
		const input = c.req.valid('json')
		const admin = c.get('admin')
		const { message, wake: wakes } = await (
			await roomFor()
		).postFromAdmin({
			uid: admin.uid,
			name: admin.name,
			body: input.body,
			routing: input.routing,
		})
		await wake(wakes, admin.name)
		return c.json(message)
	}
)

api.post(
	'/crew/messages/:id/answer',
	json(z.object({ actionId: z.string().min(1) }), 'Send { actionId }'),
	async (c) => {
		const result = await (
			await roomFor()
		).answer({
			messageId: c.req.param('id'),
			actionId: c.req.valid('json').actionId,
			name: c.get('admin').name,
		})
		if (!result.ok) return c.json({ error: result.error }, result.status)
		await deliver(
			result.agent,
			result.conversation,
			'crew.answer',
			result.body
		).catch(logFailedDelivery)
		return c.json({ ok: true })
	}
)

api.post(
	'/crew/messages/:id/correct',
	json(z.object({ routing: RoutingSchema }), 'Send { routing }'),
	async (c) => {
		const admin = c.get('admin')
		const result = await (
			await roomFor()
		).correct({
			messageId: c.req.param('id'),
			uid: admin.uid,
			routing: c.req.valid('json').routing,
		})
		if (!result.ok) return c.json({ error: result.error }, result.status)
		await wake(result.wake, admin.name)
		return c.json(result.message)
	}
)

api.get('/crew/agents/:agent', async (c) => {
	const agent = c.req.param('agent')
	if (!isCrewKey(agent)) {
		return c.json({ error: `Crew members are ${crewKeys.join(', ')}` }, 404)
	}
	return c.json(await (await roomFor()).workspace(agent, c.get('admin').uid))
})

api.delete(
	'/crew/agents/:agent/memory/:id',
	numericId('No memory there'),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No memory there' }, 404)
		const { id } = c.req.valid('param')
		const ok = await (await roomFor()).forget(agent, id, 'admin')
		return ok
			? c.json({ ok })
			: c.json({ error: 'No memory with that id' }, 404)
	}
)

api.get('/crew/enterprise', async (c) => {
	return c.json(await (await roomFor()).enterprise(c.get('admin').uid))
})

api.post(
	'/crew/enterprise/messages',
	json(z.object({ body: Text }), 'Send { body }'),
	async (c) => {
		const admin = c.get('admin')
		const { message, wake: wakes } = await (
			await roomFor()
		).postToEnterprise({
			uid: admin.uid,
			name: admin.name,
			body: c.req.valid('json').body,
		})
		await wake(wakes, admin.name)
		return c.json(message)
	}
)

api.post('/crew/enterprise/meeting', async (c) => {
	const admin = c.get('admin')
	const started = await (
		await roomFor()
	).startMeeting({ uid: admin.uid, name: admin.name })
	if (!started) return c.json({ error: 'No weekly meeting is due' }, 409)
	await wake(started.wake, admin.name)
	if (started.needsReport) await requestReport().catch(logFailedDelivery)
	return c.json(started.message)
})

api.get('/crew/memory', async (c) => {
	return c.json(await (await roomFor()).crewMemory())
})

api.post(
	'/crew/memory',
	json(z.object({ text: z.string().trim().min(1).max(500) }), 'Send { text }'),
	async (c) => {
		const id = await (await roomFor()).addCrewMemory(c.req.valid('json').text)
		return c.json({ id })
	}
)

api.delete(
	'/crew/memory/:id',
	numericId('No crew memory with that id'),
	async (c) => {
		const ok = await (await roomFor()).forgetCrewMemory(c.req.valid('param').id)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No crew memory with that id' }, 404)
	}
)

api.patch(
	'/crew/charter/:id',
	numericId('No charter entry with that id'),
	json(
		z.object({
			text: z.string().trim().min(1).max(300).optional(),
			status: z.enum(['kept', 'dropped']).optional(),
		}),
		'Send { text?, status? }'
	),
	async (c) => {
		const ok = await (
			await roomFor()
		).editCharter(c.req.valid('param').id, c.req.valid('json'))
		return ok
			? c.json({ ok })
			: c.json({ error: 'No charter entry with that id' }, 404)
	}
)

api.put(
	'/crew/weekly/timezone',
	json(
		z.object({ timezone: z.string().refine(isTimeZone) }),
		'Send an IANA time zone, like America/New_York'
	),
	async (c) => {
		await (await roomFor()).setTimezone(c.req.valid('json').timezone)
		return c.json({ ok: true })
	}
)

// The room's WebSocket, opened by useAgent. worker/api.ts has checked the
// admin, from the token in the query string.
api.get('/crew/live', async (c) => (await roomFor()).fetch(c.req.raw))

// A 1:1 chat with a fleet agent is the conversation "dm-<admin uid>", so an
// admin can only open their own. Room runs ("team") are dispatch-only, and
// Riker and Data talk to the admin in the Enterprise thread instead.
api.use('/agents/*', async (c, next) => {
	// /api/agents/<agent>/<conversation>[/...]
	const conversation = c.req.path.split('/')[4]
	if (conversation !== `dm-${c.get('admin').uid}`) {
		return c.json({ error: 'Open your own chat: dm-<your user id>' }, 403)
	}
	return next()
})
for (const key of fleetKeys) {
	const agent = crewAgents()[key]
	if (agent) api.route(`/agents/${key}`, createAgentRouter(agent))
}

export default api

// The answer is already saved, so a dispatch that fails must not become a
// 500 that invites the admin to answer again.
function logFailedDelivery(error: unknown) {
	console.error('Could not deliver an answer to its agent', error)
}

function isTimeZone(timezone: string) {
	try {
		return !!new Intl.DateTimeFormat('en-US', {
			timeZone: timezone,
		}).resolvedOptions().timeZone
	} catch {
		return false
	}
}
