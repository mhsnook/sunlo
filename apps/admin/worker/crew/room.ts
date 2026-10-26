import { DurableObject } from 'cloudflare:workers'
import {
	crew,
	crewKeys,
	fixedRouting,
	isCrewKey,
	mentionedCrew,
	type ActionType,
	type AgentStatusType,
	type CrewKey,
	type CrewMessageType,
	type RoomEvent,
	type RoomSnapshotType,
	type RoutingType,
	type WorkspaceType,
} from '../../shared/crew'
import { clefPrompt, parseClefReply, type ClefExample } from './clef'

// The conversation id every room-driven agent run uses. A 1:1 chat with an
// agent uses `dm-<admin uid>` instead.
export const TEAM = 'team'

export type Wake = { agent: CrewKey; body: string; messageId: string }

type MessageRow = {
	id: string
	at: string
	author: string
	author_name: string
	body: string
	routing: string | null
	card: string | null
	answer: string | null
	place: 'room' | 'dm'
	conversation: string
}

// An agent's mention of another agent wakes it, at most this many times an
// hour, so two agents cannot keep waking each other.
const AGENT_WAKES_PER_HOUR = 6
const SNAPSHOT_MESSAGES = 200
const CLEF_EXAMPLES_KEPT = 200
const CLEF_EXAMPLES_SHOWN = 20

const now = () => new Date().toISOString()

const toMessage = (row: MessageRow): CrewMessageType => ({
	id: row.id,
	at: row.at,
	author: row.author,
	authorName: row.author_name,
	body: row.body,
	routing: row.routing ? (JSON.parse(row.routing) as RoutingType) : null,
	card: row.card ? (JSON.parse(row.card) as CrewMessageType['card']) : null,
	answer: row.answer
		? (JSON.parse(row.answer) as CrewMessageType['answer'])
		: null,
	place: row.place,
})

// Room times for the model: minutes are enough, and UTC is explicit.
const stamp = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

// One instance, named "team", holds the crew room: the shared timeline, each
// agent's workspace (to-dos, memory, open items), CLEF's examples, and the
// admins' WebSockets. Flue's agent Durable Objects keep only their own
// conversations; everything the admin app shows lives here.
export class CrewRoom extends DurableObject<Env> {
	private sql: SqlStorage

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		this.sql = ctx.storage.sql
		this.sql.exec(`
			create table if not exists message (
				id text primary key,
				at text not null,
				author text not null,
				author_name text not null,
				body text not null,
				routing text,
				card text,
				answer text,
				place text not null,
				conversation text not null
			);
			create index if not exists message_at on message (at);
			create table if not exists todo (
				id integer primary key autoincrement,
				agent text not null,
				text text not null,
				note text,
				done integer not null default 0,
				at text not null,
				done_at text
			);
			create table if not exists memory (
				id integer primary key autoincrement,
				agent text not null,
				text text not null,
				at text not null
			);
			create table if not exists open_item (
				id integer primary key autoincrement,
				agent text not null,
				title text not null,
				tag text,
				at text not null,
				closed_at text
			);
			create table if not exists status (
				agent text primary key,
				state text not null,
				since text not null
			);
			create table if not exists cursor (
				agent text primary key,
				at text,
				pending_at text
			);
			create table if not exists seen (uid text primary key, at text not null);
			create table if not exists clef_example (
				id integer primary key autoincrement,
				text text not null,
				routing text not null,
				at text not null
			);
			create table if not exists ticket (
				id text primary key,
				uid text not null,
				expires_at integer not null
			);
			create table if not exists agent_wake (at text not null);
		`)
		ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair('ping', 'pong')
		)
	}

	// ---- The timeline -------------------------------------------------------

	snapshot(uid: string): RoomSnapshotType {
		const rows = this.sql
			.exec<MessageRow>(
				`select * from (
					select * from message where place = 'room' order by at desc, id desc limit ?
				) order by at, id`,
				SNAPSHOT_MESSAGES
			)
			.toArray()
		const seen = this.sql
			.exec<{ at: string }>('select at from seen where uid = ?', uid)
			.toArray()[0]
		return {
			messages: rows.map(toMessage),
			statuses: this.statuses(),
			seenAt: seen?.at ?? null,
		}
	}

	markSeen(uid: string) {
		this.sql.exec(
			'insert into seen (uid, at) values (?, ?) on conflict (uid) do update set at = excluded.at',
			uid,
			now()
		)
	}

	// CLEF: a trailing "..." always stacks, an @mention always routes, and
	// otherwise a small model decides between waking agents and leaving the
	// message in the room. It learns from every correction the admin makes.
	async classify(text: string): Promise<RoutingType> {
		const fixed = fixedRouting(text)
		if (fixed) return fixed
		const active = crewKeys.filter((key) => crew[key].active)
		const examples = this.sql
			.exec<{ text: string; routing: string }>(
				'select text, routing from clef_example order by id desc limit ?',
				CLEF_EXAMPLES_SHOWN
			)
			.toArray()
			.toReversed()
			.map(
				(row): ClefExample => ({
					text: row.text,
					routing: JSON.parse(row.routing) as ClefExample['routing'],
				})
			)
		try {
			const reply = await this.env.AI.run(this.env.CLEF_MODEL, {
				messages: clefPrompt(text, active, examples),
				max_tokens: 60,
				temperature: 0,
			})
			return parseClefReply(
				'response' in reply ? reply.response : undefined,
				active
			)
		} catch (error) {
			console.error('CLEF could not classify a message', error)
			// Leaving it in the room wakes nobody, so a CLEF failure costs a
			// reply, never a surprise run.
			return { kind: 'room', agents: [], by: 'model' }
		}
	}

	async postFromAdmin(input: {
		uid: string
		name: string
		body: string
		// What the compose chip showed when the admin sent. Absent when the
		// app sent before CLEF answered.
		routing: RoutingType | null
		// What CLEF suggested, when the admin changed it.
		predicted: RoutingType | null
	}): Promise<{ message: CrewMessageType; wake: Array<Wake> }> {
		const routing =
			fixedRouting(input.body) ??
			(input.routing
				? sanitize(input.routing)
				: await this.classify(input.body))
		if (input.predicted && !sameRouting(input.predicted, routing)) {
			this.sql.exec(
				'insert into clef_example (text, routing, at) values (?, ?, ?)',
				input.body,
				JSON.stringify({ kind: routing.kind, agents: routing.agents }),
				now()
			)
			this.sql.exec(
				'delete from clef_example where id not in (select id from clef_example order by id desc limit ?)',
				CLEF_EXAMPLES_KEPT
			)
		}
		const author = `admin:${input.uid}`
		const stacked = routing.kind === 'route' ? this.stackedBodies(author) : []
		const message = this.insert({
			author,
			authorName: input.name,
			body: input.body,
			routing,
			card: null,
			place: 'room',
			conversation: TEAM,
		})
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map((agent) => ({
			agent,
			body,
			messageId: message.id,
		}))
		for (const { agent } of wake) this.markWorking(agent)
		return { message, wake }
	}

	postFromAgent(input: {
		agent: CrewKey
		body: string
		card: {
			kind: 'question' | 'change'
			title: string | null
			actions: Array<ActionType>
		} | null
		place: 'room' | 'dm'
		conversation: string
	}): { message: CrewMessageType; wake: Array<Wake> } {
		const message = this.insert({
			author: input.agent,
			authorName: crew[input.agent].name,
			body: input.body,
			routing: null,
			card: input.card,
			place: input.place,
			conversation: input.conversation,
		})
		if (input.card) this.broadcast({ type: 'workspace', agent: input.agent })
		const wake: Array<Wake> = []
		if (input.place === 'room') {
			for (const agent of mentionedCrew(input.body)) {
				if (agent === input.agent || !crew[agent].active) continue
				if (!this.takeAgentWake()) break
				wake.push({ agent, body: input.body, messageId: message.id })
				this.markWorking(agent)
			}
		}
		return { message, wake }
	}

	answer(input: {
		messageId: string
		actionId: string
		name: string
	}):
		| { ok: true; agent: CrewKey; conversation: string; body: string }
		| { ok: false; status: 404 | 409; error: string } {
		const row = this.sql
			.exec<MessageRow>('select * from message where id = ?', input.messageId)
			.toArray()[0]
		const message = row && toMessage(row)
		if (!message?.card || !isCrewKey(message.author)) {
			return { ok: false, status: 404, error: 'No question with that id' }
		}
		if (message.answer) {
			return {
				ok: false,
				status: 409,
				error: `${message.answer.by} already answered "${message.answer.label}"`,
			}
		}
		const action = message.card.actions.find((a) => a.id === input.actionId)
		if (!action) {
			return {
				ok: false,
				status: 404,
				error: 'That question has no such answer',
			}
		}
		const at = now()
		const answer = {
			actionId: action.id,
			label: action.label,
			by: input.name,
			at,
		}
		this.sql.exec(
			'update message set answer = ? where id = ?',
			JSON.stringify(answer),
			message.id
		)
		const agent = message.author
		const subject = message.card.title ?? message.body
		if (message.card.kind === 'change') {
			const day = at.slice(0, 10)
			if (action.id === 'do') {
				this.remember(agent, `${input.name} agreed on ${day}: ${subject}`)
				this.addTodo(agent, subject, null)
			} else {
				this.remember(agent, `${input.name} said not yet on ${day}: ${subject}`)
			}
		}
		this.broadcast({ type: 'message', message: { ...message, answer } })
		this.broadcast({ type: 'workspace', agent })
		const what = message.card.kind === 'change' ? 'proposed change' : 'question'
		return {
			ok: true,
			agent,
			conversation: row.conversation,
			body: `${input.name} answered "${action.label}" to your ${what}: ${subject}`,
		}
	}

	// ---- Agent runs ---------------------------------------------------------

	markWorking(agent: CrewKey) {
		this.setStatus(agent, { state: 'working', since: now() })
	}

	// What an agent should wake up knowing: its workspace, and the room. A
	// room run reads everything since its last finished room run; a 1:1 chat
	// reads the latest messages and moves no cursor.
	agentContext(agent: CrewKey, conversation: string): string {
		const sections = [`It is now ${stamp(now())}.`, this.workspaceText(agent)]
		if (conversation === TEAM) {
			const cursor = this.sql
				.exec<{ at: string | null }>(
					'select at from cursor where agent = ?',
					agent
				)
				.toArray()[0]?.at
			const rows = cursor
				? this.sql
						.exec<MessageRow>(
							`select * from (
								select * from message where place = 'room' and at > ? order by at desc limit 60
							) order by at, id`,
							cursor
						)
						.toArray()
				: this.latestRoomRows(30)
			const last = rows.at(-1)?.at
			if (last) {
				this.sql.exec(
					`insert into cursor (agent, pending_at) values (?, ?)
					on conflict (agent) do update set pending_at = excluded.pending_at`,
					agent,
					last
				)
			}
			sections.push(
				cursor
					? '## The crew room since your last run'
					: '## The crew room, latest messages',
				roomText(rows) || '(nothing new)'
			)
		} else {
			sections.push(
				'## The crew room, latest messages',
				roomText(this.latestRoomRows(15)) || '(empty)'
			)
		}
		return sections.join('\n\n')
	}

	finishRun(agent: CrewKey, conversation: string) {
		if (conversation === TEAM) {
			this.sql.exec(
				'update cursor set at = coalesce(pending_at, at), pending_at = null where agent = ?',
				agent
			)
			this.setStatus(agent, { state: 'idle', since: now() })
		}
	}

	recentRoom(limit: number): string {
		return roomText(this.latestRoomRows(limit)) || '(empty)'
	}

	// ---- Workspaces ---------------------------------------------------------

	workspace(agent: CrewKey): WorkspaceType {
		const todos = this.sql
			.exec<{
				id: number
				text: string
				note: string | null
				done: number
				at: string
				done_at: string | null
			}>(
				`select * from todo where agent = ? and (done = 0 or done_at > ?)
				order by done, id`,
				agent,
				new Date(Date.now() - 14 * 86_400_000).toISOString()
			)
			.toArray()
			.map((row) => ({
				id: row.id,
				text: row.text,
				note: row.note,
				done: row.done === 1,
				at: row.at,
				doneAt: row.done_at,
			}))
		const memory = this.sql
			.exec<{ id: number; text: string; at: string }>(
				'select id, text, at from memory where agent = ? order by id',
				agent
			)
			.toArray()
		const openItems = this.sql
			.exec<{ id: number; title: string; tag: string | null; at: string }>(
				'select id, title, tag, at from open_item where agent = ? and closed_at is null order by id',
				agent
			)
			.toArray()
		const cards = this.sql
			.exec<MessageRow>(
				'select * from message where author = ? and card is not null order by at desc limit 50',
				agent
			)
			.toArray()
			.map(toMessage)
		return {
			agent,
			todos,
			memory,
			openItems,
			cards,
			status: this.statuses()[agent] ?? null,
		}
	}

	addTodo(agent: CrewKey, text: string, note: string | null) {
		const [{ id }] = this.sql
			.exec<{ id: number }>(
				'insert into todo (agent, text, note, at) values (?, ?, ?, ?) returning id',
				agent,
				text,
				note,
				now()
			)
			.toArray()
		this.broadcast({ type: 'workspace', agent })
		return id
	}

	updateTodo(
		agent: CrewKey,
		id: number,
		change: { done?: boolean; note?: string | null }
	) {
		const exists = this.sql
			.exec('select id from todo where id = ? and agent = ?', id, agent)
			.toArray()
		if (!exists.length) return false
		if (change.done !== undefined) {
			this.sql.exec(
				'update todo set done = ?, done_at = ? where id = ?',
				Number(change.done),
				change.done ? now() : null,
				id
			)
		}
		if (change.note !== undefined) {
			this.sql.exec('update todo set note = ? where id = ?', change.note, id)
		}
		this.broadcast({ type: 'workspace', agent })
		return true
	}

	remember(agent: CrewKey, text: string) {
		const [{ id }] = this.sql
			.exec<{ id: number }>(
				'insert into memory (agent, text, at) values (?, ?, ?) returning id',
				agent,
				text,
				now()
			)
			.toArray()
		this.broadcast({ type: 'workspace', agent })
		return id
	}

	forget(agent: CrewKey, id: number) {
		const deleted = this.sql
			.exec(
				'delete from memory where id = ? and agent = ? returning id',
				id,
				agent
			)
			.toArray()
		if (deleted.length) this.broadcast({ type: 'workspace', agent })
		return deleted.length > 0
	}

	addOpenItem(agent: CrewKey, title: string, tag: string | null) {
		const [{ id }] = this.sql
			.exec<{ id: number }>(
				'insert into open_item (agent, title, tag, at) values (?, ?, ?, ?) returning id',
				agent,
				title,
				tag,
				now()
			)
			.toArray()
		this.broadcast({ type: 'workspace', agent })
		return id
	}

	closeOpenItem(agent: CrewKey, id: number) {
		const closed = this.sql
			.exec(
				'update open_item set closed_at = ? where id = ? and agent = ? and closed_at is null returning id',
				now(),
				id,
				agent
			)
			.toArray()
		if (closed.length) this.broadcast({ type: 'workspace', agent })
		return closed.length > 0
	}

	// ---- Live updates -------------------------------------------------------

	// Browsers cannot set headers on a WebSocket, so the app first asks the
	// authenticated API for a ticket and opens the socket with it.
	issueTicket(uid: string) {
		const id = crypto.randomUUID()
		this.sql.exec('delete from ticket where expires_at < ?', Date.now())
		this.sql.exec(
			'insert into ticket (id, uid, expires_at) values (?, ?, ?)',
			id,
			uid,
			Date.now() + 60_000
		)
		return id
	}

	fetch(request: Request) {
		if (request.headers.get('upgrade') !== 'websocket') {
			return new Response('Open this with a WebSocket', { status: 426 })
		}
		const ticket = new URL(request.url).searchParams.get('ticket') ?? ''
		const valid = this.sql
			.exec(
				'delete from ticket where id = ? and expires_at >= ? returning uid',
				ticket,
				Date.now()
			)
			.toArray()
		if (!valid.length) {
			return new Response('The live link expired', { status: 401 })
		}
		const pair = new WebSocketPair()
		this.ctx.acceptWebSocket(pair[1])
		return new Response(null, { status: 101, webSocket: pair[0] })
	}

	// ---- Internals ----------------------------------------------------------

	private insert(input: {
		author: string
		authorName: string
		body: string
		routing: RoutingType | null
		card: CrewMessageType['card']
		place: 'room' | 'dm'
		conversation: string
	}): CrewMessageType {
		const row: MessageRow = {
			id: `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`,
			at: now(),
			author: input.author,
			author_name: input.authorName,
			body: input.body,
			routing: input.routing ? JSON.stringify(input.routing) : null,
			card: input.card ? JSON.stringify(input.card) : null,
			answer: null,
			place: input.place,
			conversation: input.conversation,
		}
		this.sql.exec(
			`insert into message (id, at, author, author_name, body, routing, card, answer, place, conversation)
			values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			row.id,
			row.at,
			row.author,
			row.author_name,
			row.body,
			row.routing,
			row.card,
			row.answer,
			row.place,
			row.conversation
		)
		const message = toMessage(row)
		if (message.place === 'room') this.broadcast({ type: 'message', message })
		return message
	}

	// The admin's "..." messages since their last message that was not one.
	private stackedBodies(author: string) {
		const rows = this.sql
			.exec<{ body: string; routing: string | null }>(
				'select body, routing from message where author = ? order by at desc, id desc limit 20',
				author
			)
			.toArray()
		const stacked: Array<string> = []
		for (const row of rows) {
			const routing = row.routing
				? (JSON.parse(row.routing) as RoutingType)
				: null
			if (routing?.kind !== 'stack') break
			stacked.unshift(row.body)
		}
		return stacked
	}

	private latestRoomRows(limit: number) {
		return this.sql
			.exec<MessageRow>(
				`select * from (
					select * from message where place = 'room' order by at desc, id desc limit ?
				) order by at, id`,
				limit
			)
			.toArray()
	}

	private workspaceText(agent: CrewKey) {
		const ws = this.workspace(agent)
		const todos = ws.todos
			.map(
				(t) =>
					`- [${t.id}]${t.done ? ' (done)' : ''} ${t.text}${t.note ? ` — ${t.note}` : ''}`
			)
			.join('\n')
		const memory = ws.memory.map((m) => `- [${m.id}] ${m.text}`).join('\n')
		const open = ws.openItems
			.map((o) => `- [${o.id}] ${o.title}${o.tag ? ` (${o.tag})` : ''}`)
			.join('\n')
		const waiting = ws.cards
			.filter((c) => !c.answer)
			.map((c) => `- ${stamp(c.at)}: ${c.card?.title ?? c.body}`)
			.join('\n')
		return [
			'## Your workspace',
			`To-do:\n${todos || '(none)'}`,
			`Memory:\n${memory || '(none)'}`,
			`Open with the admin:\n${open || '(none)'}`,
			`Your questions still waiting for an answer:\n${waiting || '(none)'}`,
		].join('\n\n')
	}

	private statuses() {
		const statuses: Record<string, AgentStatusType> = {}
		for (const row of this.sql
			.exec<{ agent: string; state: 'idle' | 'working'; since: string }>(
				'select * from status'
			)
			.toArray()) {
			statuses[row.agent] = { state: row.state, since: row.since }
		}
		return statuses
	}

	private setStatus(agent: CrewKey, status: AgentStatusType) {
		this.sql.exec(
			`insert into status (agent, state, since) values (?, ?, ?)
			on conflict (agent) do update set state = excluded.state, since = excluded.since`,
			agent,
			status.state,
			status.since
		)
		this.broadcast({ type: 'status', agent, status })
	}

	private takeAgentWake() {
		const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
		this.sql.exec('delete from agent_wake where at < ?', hourAgo)
		const [{ count }] = this.sql
			.exec<{ count: number }>('select count(*) as count from agent_wake')
			.toArray()
		if (count >= AGENT_WAKES_PER_HOUR) return false
		this.sql.exec('insert into agent_wake (at) values (?)', now())
		return true
	}

	private broadcast(event: RoomEvent) {
		const data = JSON.stringify(event)
		for (const socket of this.ctx.getWebSockets()) {
			try {
				socket.send(data)
			} catch {
				// A socket that closed between getWebSockets() and send().
			}
		}
	}
}

function sanitize(routing: RoutingType): RoutingType {
	const agents = routing.agents.filter((key) => crew[key].active)
	if (routing.kind !== 'route') return { ...routing, agents: [] }
	return agents.length
		? { ...routing, agents }
		: { kind: 'room', agents: [], by: routing.by }
}

function sameRouting(a: RoutingType, b: RoutingType) {
	return (
		a.kind === b.kind &&
		a.agents.toSorted().join() === b.agents.toSorted().join()
	)
}

function roomText(rows: Array<MessageRow>) {
	return rows
		.map((row) => {
			const message = toMessage(row)
			const note =
				message.routing?.kind === 'stack'
					? ' (more coming)'
					: message.routing?.kind === 'room'
						? ' (left in the room)'
						: ''
			const card = message.card
				? message.answer
					? ` [answered: ${message.answer.label}]`
					: ` [waiting for an answer: ${message.card.actions.map((a) => a.label).join(' / ')}]`
				: ''
			return `[${stamp(message.at)}] ${message.authorName}${note}: ${message.body}${card}`
		})
		.join('\n')
}
