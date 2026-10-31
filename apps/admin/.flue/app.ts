import { validator } from 'hono/validator'
import { z } from 'zod'
import {
	adminAuthor,
	CharterEntrySchema,
	crewKeys,
	GithubDraftSchema,
	PickChoiceSchema,
	isCrewKey,
	isRoomKey,
	MAX_UPLOAD_BYTES,
	MAX_IMAGES_PER_MESSAGE,
	PainterStyleInputSchema,
	roomKeys,
	PlaceSchema,
	RoutingSchema,
} from '../shared/crew'
import { restoreSummary } from '../worker/crew/documents'
import { createApi } from '../worker/api'
import { imageInfo, verifyImageLink } from '../worker/images'
import { SVG_POLICY } from '../worker/svg'
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

const AdminMessage = z
	.object({
		body: z.string().trim().max(8000),
		images: z.array(z.number().int()).max(MAX_IMAGES_PER_MESSAGE).default([]),
	})
	.refine((message) => !!message.body || message.images.length > 0)

const imageHeaders = (mimeType: string) => ({
	'content-type': mimeType,
	'x-content-type-options': 'nosniff',
})

api.get('/crew/room', async (c) => {
	// The app loads this first, so the room learns the origin it is served
	// on, which the painter's signed links need.
	const room = await roomFor()
	return c.json(
		await room.snapshot(c.get('admin').uid, new URL(c.req.url).origin)
	)
})

api.get('/crew/runs', async (c) => {
	return c.json(await (await roomFor()).runs())
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
		AdminMessage.and(
			z.object({
				// The place the admin picked from the chip, or null for CLEF.
				routing: RoutingSchema.nullable(),
			})
		),
		'Send { body, images?, routing }, with text or images'
	),
	async (c) => {
		const input = c.req.valid('json')
		const admin = c.get('admin')
		const room = await roomFor()
		const images = await room.findImages(input.images)
		if (!images) return c.json({ error: 'One of those images is gone' }, 400)
		const { message, wake: wakes } = await room.postFromAdmin({
			uid: admin.uid,
			name: admin.name,
			body: input.body,
			images,
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

// Files a "github" card's draft, as the admin edited it, on GitHub.
api.post(
	'/crew/messages/:id/file',
	json(
		z.object({
			draft: GithubDraftSchema,
			note: z.string().trim().max(2000).optional(),
		}),
		'Send { draft, note? }'
	),
	async (c) => {
		const admin = c.get('admin')
		const filed = await (
			await roomFor()
		).fileDraft({
			messageId: c.req.param('id'),
			draft: c.req.valid('json').draft,
			note: c.req.valid('json').note || null,
			uid: admin.uid,
			name: admin.name,
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
		const ok = await (await roomFor()).forget(agent, id, 'admin', null)
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

api.post(
	'/crew/agents/:agent/memory',
	json(z.object({ text: z.string().trim().min(1).max(2000) }), 'Send { text }'),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No crew member there' }, 404)
		const id = await (
			await roomFor()
		).addMemoryForAgent(agent, c.req.valid('json').text)
		return c.json({ id })
	}
)

// An officer's persona. A PUT saves the admin's own text; a DELETE restores
// the one in code.
api.put(
	'/crew/agents/:agent/character',
	json(
		z.object({ text: z.string().trim().min(1).max(20_000) }),
		'Send { text }'
	),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No crew member there' }, 404)
		const ok = await (
			await roomFor()
		).setCharacter(agent, c.req.valid('json').text)
		return ok
			? c.json({ ok })
			: c.json({ error: 'That seat has not started yet' }, 404)
	}
)

api.delete('/crew/agents/:agent/character', async (c) => {
	const agent = c.req.param('agent')
	if (!isCrewKey(agent)) return c.json({ error: 'No crew member there' }, 404)
	return c.json({ ok: await (await roomFor()).restoreCharacter(agent) })
})

const TodoText = z.string().trim().min(1).max(200)
const TodoNote = z.string().trim().max(80)

api.post(
	'/crew/agents/:agent/todos',
	json(
		z.object({ text: TodoText, note: TodoNote.optional() }),
		'Send { text, note? }'
	),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No crew member there' }, 404)
		const { text, note } = c.req.valid('json')
		const id = await (
			await roomFor()
		).addTodoForAgent(agent, text, note || null)
		return c.json({ id })
	}
)

api.patch(
	'/crew/agents/:agent/todos/:id',
	numericId('No to-do there'),
	json(
		z.object({
			text: TodoText.optional(),
			note: TodoNote.nullable().optional(),
			done: z.boolean().optional(),
		}),
		'Send { text?, note?, done? }'
	),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No to-do there' }, 404)
		const change = c.req.valid('json')
		const ok = await (
			await roomFor()
		).editTodoForAgent(agent, c.req.valid('param').id, {
			...change,
			...(change.note !== undefined ? { note: change.note || null } : {}),
		})
		return ok ? c.json({ ok }) : c.json({ error: 'No to-do with that id' }, 404)
	}
)

api.delete(
	'/crew/agents/:agent/todos/:id',
	numericId('No to-do there'),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No to-do there' }, 404)
		const ok = await (
			await roomFor()
		).deleteTodoForAgent(agent, c.req.valid('param').id)
		return ok ? c.json({ ok }) : c.json({ error: 'No to-do with that id' }, 404)
	}
)

api.patch(
	'/crew/agents/:agent/open-items/:id',
	numericId('No open item there'),
	json(
		z.object({ title: z.string().trim().min(1).max(120) }),
		'Send { title }'
	),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No open item there' }, 404)
		const ok = await (
			await roomFor()
		).editOpenItemForAgent(
			agent,
			c.req.valid('param').id,
			c.req.valid('json').title
		)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No open item with that id' }, 404)
	}
)

// Closes the item: it stops waiting on the admin.
api.delete(
	'/crew/agents/:agent/open-items/:id',
	numericId('No open item there'),
	async (c) => {
		const agent = c.req.param('agent')
		if (!isCrewKey(agent)) return c.json({ error: 'No open item there' }, 404)
		const ok = await (
			await roomFor()
		).closeOpenItemForAgent(agent, c.req.valid('param').id)
		return ok
			? c.json({ ok })
			: c.json({ error: 'No open item with that id' }, 404)
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
	json(AdminMessage, 'Send { body, images? }, with text or images'),
	async (c) => {
		const admin = c.get('admin')
		const input = c.req.valid('json')
		const room = await roomFor()
		const images = await room.findImages(input.images)
		if (!images) return c.json({ error: 'One of those images is gone' }, 400)
		const { message, wake: wakes } = await room.postToRoom({
			uid: admin.uid,
			name: admin.name,
			room: c.req.valid('param').room,
			body: input.body,
			images,
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

// An entry the admin writes is kept at once.
api.post(
	'/crew/rooms/:room/charter',
	roomParam,
	json(
		z.object({
			kind: CharterEntrySchema.shape.kind,
			text: z.string().trim().min(1).max(300),
		}),
		'Send { kind, text }'
	),
	async (c) => {
		const { kind, text } = c.req.valid('json')
		const id = await (
			await roomFor()
		).addCharter(c.req.valid('param').room, kind, text)
		return c.json({ id })
	}
)

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

api.get('/crew/sketches/:id', numericId('No such sketch'), async (c) => {
	const sketch = await (await roomFor()).sketch(c.req.valid('param').id)
	return sketch ? c.json(sketch) : c.json({ error: 'No such sketch' }, 404)
})

api.get('/crew/sketches/:id/image', numericId('No such sketch'), async (c) => {
	const shot = await (await roomFor()).sketchImage(c.req.valid('param').id)
	if (!shot) return c.json({ error: 'No such sketch' }, 404)
	return c.body(shot.image, 200, {
		'content-type': shot.mimeType,
		'cache-control': 'private, max-age=31536000, immutable',
	})
})

// The body is the image itself, with its content type. A message then
// names it by the id this returns.
api.post('/crew/images', async (c) => {
	if (!c.req.header('content-type')?.startsWith('image/')) {
		return c.json({ error: 'Send the image as an image/* body' }, 400)
	}
	if (Number(c.req.header('content-length') ?? 0) > MAX_UPLOAD_BYTES) {
		return c.json({ error: 'That image is too big to keep' }, 413)
	}
	const bytes = await c.req.arrayBuffer()
	if (bytes.byteLength > MAX_UPLOAD_BYTES) {
		return c.json({ error: 'That image is too big to keep' }, 413)
	}
	const info = imageInfo(new Uint8Array(bytes))
	if (!info) {
		return c.json({ error: 'Send a PNG, JPEG, WebP or GIF image' }, 400)
	}
	const image = await (
		await roomFor()
	).saveImage({
		kind: 'upload',
		author: adminAuthor(c.get('admin').uid),
		...info,
		bytes,
	})
	return c.json(image)
})

api.get('/crew/images/:id', numericId('No such image'), async (c) => {
	const image = await (await roomFor()).image(c.req.valid('param').id)
	if (!image) return c.json({ error: 'No such image' }, 404)
	return c.body(image.bytes, 200, {
		...imageHeaders(image.mimeType),
		'cache-control': 'private, max-age=31536000, immutable',
	})
})

// A signed link to one image, for a service that cannot send the admin's
// token, such as an image model fetching a reference image. worker/api.ts
// lets /api/public/ through without a token; the signature is the check.
api.get('/public/images/:id', numericId('No such image'), async (c) => {
	const { id } = c.req.valid('param')
	const valid = await verifyImageLink(c.env.IMAGE_URL_SECRET, {
		id,
		expires: c.req.query('expires'),
		sig: c.req.query('sig'),
	})
	if (!valid) return c.json({ error: 'This link is not valid' }, 403)
	const image = await (await roomFor()).image(id)
	if (!image) return c.json({ error: 'No such image' }, 404)
	return c.body(image.bytes, 200, {
		...imageHeaders(image.mimeType),
		// No shared cache may serve the image after the link expires.
		'cache-control': 'no-store',
	})
})

// An SVG's text. It can only be kept once it passes checkSvg, and the app
// shows it only through <img>; these headers are the layer that holds if
// someone opens the route itself: no script runs in a sandboxed document,
// and the browser saves the file instead of showing it.
api.get('/crew/svgs/:id', numericId('No such SVG'), async (c) => {
	const { id } = c.req.valid('param')
	const svg = await (await roomFor()).svg(id)
	if (!svg) return c.json({ error: 'No such SVG' }, 404)
	return c.body(svg.text, 200, {
		'content-type': 'image/svg+xml; charset=utf-8',
		'content-security-policy': SVG_POLICY,
		'content-disposition': `attachment; filename="svg-${id}.svg"`,
		'x-content-type-options': 'nosniff',
		'cache-control': 'private, max-age=31536000, immutable',
	})
})

api.get('/crew/painter-styles', async (c) => {
	return c.json(await (await roomFor()).painterStyles())
})

api.post(
	'/crew/painter-styles',
	json(PainterStyleInputSchema, 'Send { name, description, prompt, model }'),
	async (c) => {
		const saved = await (
			await roomFor()
		).savePainterStyle(null, c.req.valid('json'))
		return saved.ok
			? c.json({ id: saved.id })
			: c.json({ error: saved.error }, saved.status)
	}
)

api.put(
	'/crew/painter-styles/:id',
	numericId('No style with that id'),
	json(PainterStyleInputSchema, 'Send { name, description, prompt, model }'),
	async (c) => {
		const saved = await (
			await roomFor()
		).savePainterStyle(c.req.valid('param').id, c.req.valid('json'))
		return saved.ok
			? c.json({ id: saved.id })
			: c.json({ error: saved.error }, saved.status)
	}
)

api.delete(
	'/crew/painter-styles/:id',
	numericId('No style with that id'),
	async (c) => {
		const ok = await (
			await roomFor()
		).deletePainterStyle(c.req.valid('param').id)
		return ok ? c.json({ ok }) : c.json({ error: 'No style with that id' }, 404)
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
