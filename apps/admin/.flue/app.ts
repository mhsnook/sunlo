import { validator } from 'hono/validator'
import { z } from 'zod'
import {
	adminAuthor,
	crewKeys,
	GithubDraftSchema,
	PickChoiceSchema,
	isCrewKey,
	isRoomKey,
	roomKeys,
	PlaceSchema,
	RoutingSchema,
} from '../shared/crew'
import { restoreSummary } from '../worker/crew/documents'
import { createApi } from '../worker/api'
import { deliver, requestReport, roomFor, wake } from './crew'

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
	json(z.object({ place: PlaceSchema }), 'Send { place }'),
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
	json(
		z.object({
			actionId: z.string().min(1),
			feedback: z.string().trim().max(2000).optional(),
		}),
		'Send { actionId, feedback? }'
	),
	async (c) => {
		const result = await (
			await roomFor()
		).answer({
			messageId: c.req.param('id'),
			actionId: c.req.valid('json').actionId,
			feedback: c.req.valid('json').feedback || null,
			name: c.get('admin').name,
		})
		if (!result.ok) return c.json({ error: result.error }, result.status)
		await deliver(result.agent, 'crew.answer', result.body).catch(
			logFailedDelivery
		)
		return c.json({ ok: true })
	}
)

// Files a "github" card's draft, as the admin edited it, on GitHub.
api.post(
	'/crew/messages/:id/file',
	json(z.object({ draft: GithubDraftSchema }), 'Send { draft }'),
	async (c) => {
		const filed = await (
			await roomFor()
		).fileDraft({
			messageId: c.req.param('id'),
			draft: c.req.valid('json').draft,
			name: c.get('admin').name,
		})
		if (!filed.ok) return c.json({ error: filed.error }, filed.status)
		await deliver(filed.agent, 'crew.answer', filed.report).catch(
			logFailedDelivery
		)
		return c.json({ url: filed.url })
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
	return c.json(await (await roomFor()).workspace(agent))
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

api.patch(
	'/crew/agents/:agent/memory/:id',
	numericId('No memory there'),
	json(z.object({ text: z.string().trim().min(1).max(2000) }), 'Send { text }'),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No memory there' }, 404)
		const ok = await (
			await roomFor()
		).editMemory(agent, c.req.valid('param').id, c.req.valid('json').text)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No memory with that id' }, 404)
	}
)

const roomParam = validator('param', (value, c) =>
	isRoomKey(value.room)
		? { room: value.room }
		: c.json({ error: `Rooms are ${roomKeys.join(', ')}` }, 404)
)

api.get('/crew/rooms/:room', roomParam, async (c) => {
	return c.json(
		await (
			await roomFor()
		).thread(c.get('admin').uid, c.req.valid('param').room)
	)
})

api.post(
	'/crew/rooms/:room/messages',
	roomParam,
	json(z.object({ body: Text }), 'Send { body }'),
	async (c) => {
		const admin = c.get('admin')
		const { message, wake: wakes } = await (
			await roomFor()
		).postToRoom({
			uid: admin.uid,
			name: admin.name,
			room: c.req.valid('param').room,
			body: c.req.valid('json').body,
		})
		await wake(wakes, admin.name)
		return c.json(message)
	}
)

api.get('/crew/command', async (c) => {
	return c.json(await (await roomFor()).command())
})

api.post('/crew/meeting', async (c) => {
	const admin = c.get('admin')
	const started = await (
		await roomFor()
	).startMeeting({ uid: admin.uid, name: admin.name })
	if (!started) return c.json({ error: 'No weekly meeting is due' }, 409)
	await wake(started.wake, admin.name)
	if (started.needsReport) await requestReport().catch(logFailedDelivery)
	return c.json(started.message)
})

api.get('/crew/knowledge', async (c) => {
	return c.json(await (await roomFor()).commonKnowledge())
})

api.post(
	'/crew/knowledge',
	json(z.object({ text: z.string().trim().min(1).max(500) }), 'Send { text }'),
	async (c) => {
		const id = await (
			await roomFor()
		).addCommonKnowledge(c.req.valid('json').text)
		return c.json({ id })
	}
)

api.delete(
	'/crew/knowledge/:id',
	numericId('No Common Knowledge entry with that id'),
	async (c) => {
		const ok = await (
			await roomFor()
		).forgetCommonKnowledge(c.req.valid('param').id)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No Common Knowledge entry with that id' }, 404)
	}
)

api.patch(
	'/crew/knowledge/:id',
	numericId('No Common Knowledge entry with that id'),
	json(z.object({ text: z.string().trim().min(1).max(500) }), 'Send { text }'),
	async (c) => {
		const ok = await (
			await roomFor()
		).editCommonKnowledge(c.req.valid('param').id, c.req.valid('json').text)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No Common Knowledge entry with that id' }, 404)
	}
)

api.get('/crew/rooms/:room/charter', roomParam, async (c) => {
	return c.json(await (await roomFor()).charter(c.req.valid('param').room))
})

api.post(
	'/crew/messages/:id/pick',
	json(z.object({ chosen: PickChoiceSchema }), 'Send { chosen }'),
	async (c) => {
		const result = await (
			await roomFor()
		).recordPick({
			messageId: c.req.param('id'),
			chosen: c.req.valid('json').chosen,
			name: c.get('admin').name,
		})
		if (!result.ok) return c.json({ error: result.error }, result.status)
		await Promise.all(
			result.reports.map((report) =>
				deliver(report.agent, 'crew.answer', report.body).catch(
					logFailedDelivery
				)
			)
		)
		return c.json({ ok: true })
	}
)

api.get('/crew/rooms/:room/documents', roomParam, async (c) => {
	return c.json(await (await roomFor()).documents(c.req.valid('param').room))
})

api.get(
	'/crew/documents/:id',
	numericId('No document with that id'),
	async (c) => {
		const document = await (await roomFor()).document(c.req.valid('param').id)
		return document
			? c.json(document)
			: c.json({ error: 'No document with that id' }, 404)
	}
)

api.get(
	'/crew/documents/:id/revisions/:revision',
	numericId('No document with that id'),
	async (c) => {
		const revision = await (
			await roomFor()
		).revision(c.req.valid('param').id, Number(c.req.param('revision')))
		return revision
			? c.json(revision)
			: c.json({ error: 'No revision with that number' }, 404)
	}
)

// A save names the revision it started from, and answers 409 if the
// document has moved on. `restores` saves that older revision's text.
api.put(
	'/crew/documents/:id',
	numericId('No document with that id'),
	json(
		z.union([
			z.object({
				text: z.string().trim().min(1),
				summary: z.string().trim().max(140).default(''),
				baseRevision: z.number().int().min(0),
			}),
			z.object({
				restores: z.number().int().min(1),
				baseRevision: z.number().int().min(0),
			}),
		]),
		'Send { text, summary?, baseRevision } or { restores, baseRevision }'
	),
	async (c) => {
		const admin = c.get('admin')
		const room = await roomFor()
		const { id } = c.req.valid('param')
		const input = c.req.valid('json')
		let text: string
		let summary: string
		if ('restores' in input) {
			const old = await room.revision(id, input.restores)
			if (!old) return c.json({ error: 'No revision with that number' }, 404)
			text = old.text
			summary = restoreSummary(input.restores)
		} else {
			text = input.text
			summary = input.summary
		}
		const saved = await room.editDocument({
			id,
			text,
			summary,
			baseRevision: input.baseRevision,
			by: adminAuthor(admin.uid),
			byName: admin.name,
		})
		return saved.ok
			? c.json({ revision: saved.revision })
			: c.json({ error: saved.error }, saved.status)
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
