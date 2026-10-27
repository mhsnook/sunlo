import { Agent } from 'agents'
import {
	adminAuthor,
	bridgeKeys,
	crew,
	crewKeys,
	fixedRouting,
	meetingDue,
	isCrewKey,
	mentionedCrew,
	type ActionType,
	type AgentStatusType,
	type RoomStateType,
	type CrewKey,
	type CrewMessageType,
	type StackItemType,
	type StackType,
	type CharterEntryType,
	type WeeklyType,
	type MemoryType,
	type OpenItemType,
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
	corrected: string | null
}

type StackRow = {
	id: number
	kind: StackItemType['kind']
	author: CrewKey
	title: string
	body: string
	actions: string
	answer: string | null
	status: 'open' | 'done'
	ref: number | null
	at: string
}

type CharterRow = {
	id: number
	kind: CharterEntryType['kind']
	text: string
	why: string | null
	status: CharterEntryType['status']
	at: string
	kept_at: string | null
}

type IdRow = { id: number }
type CountRow = { count: number }

type Playbook = { kind: 'metric' | 'chart'; domain: string | null }

// An agent's mention of another agent wakes it, at most this many times an
// hour, so two agents cannot keep waking each other.
const AGENT_WAKES_PER_HOUR = 6
// Riker and Data may talk back and forth this many turns in a row before
// the admin says something; a discussion longer than that waits for them.
const BRIDGE_TURNS = 8
const SNAPSHOT_MESSAGES = 200
const CLEF_EXAMPLES_SHOWN = 20

const now = () => new Date().toISOString()
// Done to-dos and answered stack items stay in view this long.
const twoWeeksAgo = () => new Date(Date.now() - 14 * 86_400_000).toISOString()

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
	corrected: row.corrected ? (JSON.parse(row.corrected) as RoutingType) : null,
})

const toStackItem = (row: StackRow): StackItemType => ({
	id: row.id,
	kind: row.kind,
	author: row.author,
	title: row.title,
	body: row.body,
	actions: JSON.parse(row.actions) as StackItemType['actions'],
	answer: row.answer
		? (JSON.parse(row.answer) as StackItemType['answer'])
		: null,
	status: row.status,
	at: row.at,
})

const toCharter = (row: CharterRow): CharterEntryType => ({
	id: row.id,
	kind: row.kind,
	text: row.text,
	why: row.why,
	status: row.status,
	at: row.at,
	keptAt: row.kept_at,
})

// Room times for the model: minutes are enough, and UTC is explicit.
const stamp = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`

// One instance, named "team", holds the crew room: the shared timeline, each
// agent's workspace (to-dos, memory, open items), CLEF's decision log, and
// the admins' WebSockets. It is an Agents SDK Agent with no model: browsers
// connect with useAgent, and its state (each agent's status) syncs to them.
// Flue's agent Durable Objects keep only their own conversations.
export class CrewRoom extends Agent<Env, RoomStateType> {
	initialState: RoomStateType = {
		statuses: {},
		weekly: {
			briefAt: null,
			meetingAt: null,
			timezone: 'America/New_York',
		},
		stackCount: 0,
	}

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		this.sql`
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
				conversation text not null,
				corrected text
			);
			create index if not exists message_at on message (at);
			create index if not exists message_author on message (author, at);
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
				at text not null,
				kind text not null default 'fact',
				domain text
			);
			create table if not exists open_item (
				id integer primary key autoincrement,
				agent text not null,
				title text not null,
				tag text,
				at text not null,
				closed_at text
			);
			create table if not exists cursor (
				agent text primary key,
				at text,
				pending_at text
			);
			create table if not exists seen (uid text primary key, at text not null);
			create table if not exists clef_decision (
				message_id text primary key,
				text text not null,
				predicted text not null,
				final text not null,
				corrected text,
				outcomes text not null default '{}',
				at text not null
			);
			create table if not exists agent_wake (at text not null);
			-- The room messages delivered to an agent's current run.
			create table if not exists run_message (
				agent text not null,
				message_id text not null,
				primary key (agent, message_id)
			);
			-- Every workspace edit, so a run's receipt lists what it changed.
			create table if not exists edit_log (
				agent text not null,
				what text not null,
				at text not null
			);
			create table if not exists charter (
				id integer primary key autoincrement,
				kind text not null,
				text text not null,
				why text,
				status text not null,
				at text not null,
				kept_at text
			);
			create table if not exists stack_item (
				id integer primary key autoincrement,
				kind text not null,
				author text not null,
				title text not null,
				body text not null,
				actions text not null,
				answer text,
				status text not null default 'open',
				-- The charter entry a "charter" item proposes.
				ref integer,
				at text not null,
				done_at text
			);
		`
	}

	// ---- The timeline -------------------------------------------------------

	snapshot(uid: string): RoomSnapshotType {
		const seen = this.sql<{
			at: string
		}>`select at from seen where uid = ${uid}`[0]
		return {
			...this.state,
			messages: this.latestRoomRows(SNAPSHOT_MESSAGES).map(toMessage),
			seenAt: seen?.at ?? null,
		}
	}

	markSeen(uid: string) {
		this.sql`
			insert into seen (uid, at)
			values (${uid}, ${now()})
			on conflict (uid) do update set at = excluded.at`
	}

	// CLEF: a trailing "..." always stacks, an @mention always routes, and
	// otherwise a small model decides between waking agents and leaving the
	// message in the room. It learns from every correction the admin makes.
	async classify(text: string): Promise<RoutingType> {
		const fixed = fixedRouting(text)
		if (fixed) return fixed
		const active = crewKeys.filter((key) => crew[key].active)
		// The admin's corrections, before and after sending, are the labels.
		const examples = this.sql<{
			text: string
			routing: string
		}>`select text, coalesce(corrected, final) as routing from clef_decision
				where corrected is not null or predicted != final
				order by at desc limit ${CLEF_EXAMPLES_SHOWN}`
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
		// What CLEF suggested before the admin sent. Absent when the app sent
		// before CLEF answered.
		predicted: RoutingType | null
	}): Promise<{ message: CrewMessageType; wake: Array<Wake> }> {
		const fixed = fixedRouting(input.body)
		const predicted =
			fixed ?? input.predicted ?? (await this.classify(input.body))
		const routing =
			fixed ?? (input.routing ? sanitize(input.routing) : predicted)
		const author = adminAuthor(input.uid)
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
		this.sql`insert into clef_decision (message_id, text, predicted, final, at)
			values (${message.id}, ${input.body}, ${labelOf(predicted)}, ${labelOf(routing)}, ${message.at})`
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map((agent) => ({
			agent,
			body,
			messageId: message.id,
		}))
		return { message, wake }
	}

	// The admin says, after sending, where a message should have gone. The
	// correction becomes a CLEF label, and agents it names that the message
	// and earlier corrections did not wake are woken now.
	correct(input: {
		messageId: string
		uid: string
		routing: RoutingType
	}):
		| { ok: true; message: CrewMessageType; wake: Array<Wake> }
		| { ok: false; status: 404; error: string } {
		const row = this.sql<MessageRow>`
			select * from message
			where id = ${input.messageId} and author = ${adminAuthor(input.uid)}`[0]
		if (!row?.routing) {
			return {
				ok: false,
				status: 404,
				error: 'You sent no message with that id',
			}
		}
		const original = toMessage(row)
		const woken = new Set([
			...(original.routing?.agents ?? []),
			...(original.corrected?.agents ?? []),
		])
		const corrected = sanitize({ ...input.routing, by: 'you' })
		this.sql`
			update message set corrected = ${JSON.stringify(corrected)}
			where id = ${row.id}`
		this.sql`
			update clef_decision set corrected = ${labelOf(corrected)}
			where message_id = ${row.id}`
		const message = { ...original, corrected }
		this.push({ type: 'message', message })
		const wake = corrected.agents
			.filter((agent) => !woken.has(agent))
			.map((agent) => ({ agent, body: row.body, messageId: row.id }))
		return { ok: true, message, wake }
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
		if (input.card) this.push({ type: 'workspace', agent: input.agent })
		const wake: Array<Wake> = []
		if (input.place === 'room') {
			for (const agent of mentionedCrew(input.body)) {
				if (agent === input.agent || !crew[agent].active) continue
				const bridgeTalk =
					bridgeKeys.includes(agent) && bridgeKeys.includes(input.agent)
				if (bridgeTalk ? !this.bridgeTurnLeft() : !this.takeAgentWake()) {
					continue
				}
				wake.push({ agent, body: input.body, messageId: message.id })
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
		const row = this.sql<MessageRow>`
			select * from message
			where id = ${input.messageId}`[0]
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
		this.sql`
			update message set answer = ${JSON.stringify(answer)}
			where id = ${message.id}`
		const agent = message.author
		const subject = message.card.title ?? message.body
		if (message.card.kind === 'change') {
			const day = at.slice(0, 10)
			if (action.id === 'do') {
				this.saveMemory(agent, `${input.name} agreed on ${day}: ${subject}`)
				this.saveTodo(agent, subject, null)
			} else {
				this.saveMemory(
					agent,
					`${input.name} said not yet on ${day}: ${subject}`
				)
			}
		}
		this.push({ type: 'message', message: { ...message, answer } })
		this.push({ type: 'workspace', agent })
		const what = message.card.kind === 'change' ? 'proposed change' : 'question'
		return {
			ok: true,
			agent,
			conversation: row.conversation,
			body: `${input.name} answered "${action.label}" to your ${what}: ${subject}`,
		}
	}

	// ---- Agent runs ---------------------------------------------------------

	// What an agent should wake up knowing: its workspace, and the room. A
	// room run reads everything since its last finished room run; a 1:1 chat
	// reads the latest messages and moves no cursor. Called once for each
	// message a run receives: messages that reach a busy agent join its run.
	agentContext(
		agent: CrewKey,
		conversation: string,
		messageId: string | null
	): string {
		if (conversation === TEAM) {
			if (this.state.statuses[agent]?.state !== 'working') {
				this.setStatus(agent, { state: 'working', since: now() })
			}
			if (messageId) {
				this.sql`
					insert or ignore into run_message (agent, message_id)
					values (${agent}, ${messageId})`
			}
		}
		const sections = [`It is now ${stamp(now())}.`]
		if (bridgeKeys.includes(agent)) sections.push(this.bridgeText())
		sections.push(this.workspaceText(agent))
		if (conversation === TEAM) {
			const cursor = this.sql<{
				at: string | null
			}>`select at from cursor where agent = ${agent}`[0]?.at
			const rows = cursor
				? this.sql<MessageRow>`select * from (
								select * from message where place = 'room' and at > ${cursor} order by at desc limit 60
							) order by at, id`
				: this.latestRoomRows(30)
			const last = rows.at(-1)?.at
			if (last) {
				this.sql`
					insert into cursor (agent, pending_at) values (${agent}, ${last})
					on conflict (agent) do update set pending_at = excluded.pending_at`
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
		if (conversation !== TEAM) return
		this.sql`
			update cursor set at = coalesce(pending_at, at), pending_at = null
			where agent = ${agent}`
		const since = this.state.statuses[agent]?.since
		if (since) {
			this.recordOutcomes(agent, since)
			this.postReceipt(agent, since)
		}
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	// A room run that failed or was aborted never reaches finishRun.
	failRun(agent: CrewKey) {
		this.sql`delete from run_message where agent = ${agent}`
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	recentRoom(limit: number): string {
		return roomText(this.latestRoomRows(limit)) || '(empty)'
	}

	// ---- Workspaces ---------------------------------------------------------

	workspace(agent: CrewKey): WorkspaceType {
		const todos = this.sql<{
			id: number
			text: string
			note: string | null
			done: number
			at: string
			done_at: string | null
		}>`select * from todo where agent = ${agent} and (done = 0 or done_at > ${twoWeeksAgo()})
				order by done, id`.map((row) => ({
			id: row.id,
			text: row.text,
			note: row.note,
			done: row.done === 1,
			at: row.at,
			doneAt: row.done_at,
		}))
		const memory = this.sql<MemoryType>`
			select id, kind, domain, text, at from memory
			where agent = ${agent}
			order by kind, domain, id`
		const openItems = this.sql<OpenItemType>`
			select id, title, tag, at from open_item
			where agent = ${agent} and closed_at is null
			order by id`
		const cards = this.sql<MessageRow>`
			select * from message
			where author = ${agent} and card is not null
			order by at desc
			limit 50`.map(toMessage)
		return {
			agent,
			todos,
			memory,
			openItems,
			cards,
		}
	}

	addTodo(agent: CrewKey, text: string, note: string | null) {
		const id = this.saveTodo(agent, text, note)
		this.workspaceEdited(agent, `added to-do "${text}"`)
		return id
	}

	updateTodo(
		agent: CrewKey,
		id: number,
		change: { done?: boolean; note?: string | null }
	) {
		const exists = this.sql`
			select id from todo
			where id = ${id} and agent = ${agent}`
		if (!exists.length) return false
		if (change.done !== undefined) {
			this.sql`
				update todo set done = ${Number(change.done)}, done_at = ${change.done ? now() : null}
				where id = ${id}`
		}
		if (change.note !== undefined) {
			this.sql`update todo set note = ${change.note} where id = ${id}`
		}
		this.workspaceEdited(
			agent,
			change.done === true
				? `finished to-do ${id}`
				: change.done === false
					? `reopened to-do ${id}`
					: `updated to-do ${id}`
		)
		return true
	}

	remember(agent: CrewKey, text: string, playbook: Playbook | null = null) {
		const id = this.saveMemory(agent, text, playbook)
		this.workspaceEdited(agent, `saved memory "${text}"`)
		return id
	}

	// `by` is who deleted it: only an agent's own edits go in its receipt.
	forget(agent: CrewKey, id: number, by: 'agent' | 'admin') {
		const deleted = this.sql`
			delete from memory
			where id = ${id} and agent = ${agent}
			returning id`
		if (deleted.length && by === 'agent') {
			this.workspaceEdited(agent, `forgot memory ${id}`)
		} else if (deleted.length) {
			this.push({ type: 'workspace', agent })
		}
		return deleted.length > 0
	}

	addOpenItem(agent: CrewKey, title: string, tag: string | null) {
		const { id } = this.sql<{ id: number }>`
			insert into open_item (agent, title, tag, at)
			values (${agent}, ${title}, ${tag}, ${now()})
			returning id`[0]
		this.workspaceEdited(agent, `opened item "${title}"`)
		return id
	}

	closeOpenItem(agent: CrewKey, id: number) {
		const closed = this.sql`
			update open_item set closed_at = ${now()}
			where id = ${id} and agent = ${agent} and closed_at is null
			returning id`
		if (closed.length) this.workspaceEdited(agent, `closed item ${id}`)
		return closed.length > 0
	}

	// ---- The bridge: the admin's stack, the charter, the weekly cycle -----

	stack(): StackType {
		const items = this.sql<StackRow>`select * from stack_item
				where status = 'open' or done_at > ${twoWeeksAgo()}
				order by status = 'open' desc, at desc limit 100`.map(toStackItem)
		const charter = this.sql<CharterRow>`
			select * from charter
			where status != 'dropped'
			order by kind, id`.map(toCharter)
		return { items, charter }
	}

	bringToAdmin(input: {
		author: CrewKey
		kind: StackItemType['kind']
		title: string
		body: string
		actions: StackItemType['actions']
		ref?: number | null
	}) {
		const { id } = this.sql<IdRow>`
			insert into stack_item (kind, author, title, body, actions, ref, at)
			values (${input.kind}, ${input.author}, ${input.title}, ${input.body}, ${JSON.stringify(input.actions)}, ${input.ref ?? null}, ${now()})
			returning id`[0]
		this.stackChanged()
		return id
	}

	// A principle or lesson waits in the admin's stack until they keep it.
	proposeCharter(input: {
		author: CrewKey
		kind: CharterEntryType['kind']
		text: string
		why: string
	}) {
		const { id } = this.sql<IdRow>`
			insert into charter (kind, text, why, status, at)
			values (${input.kind}, ${input.text}, ${input.why}, 'proposed', ${now()})
			returning id`[0]
		return this.bringToAdmin({
			author: input.author,
			kind: 'charter',
			title: input.text,
			body: input.why,
			actions: [
				{ id: 'keep', label: 'Keep it' },
				{ id: 'not-quite', label: 'Not quite' },
			],
			ref: id,
		})
	}

	// Only the admin edits the charter directly; agents propose.
	editCharter(
		id: number,
		change: { text?: string; status?: 'kept' | 'dropped' }
	) {
		const row = this.sql<CharterRow>`select * from charter where id = ${id}`[0]
		if (!row) return false
		this.sql`
			update charter set text = ${change.text ?? row.text}, status = ${change.status ?? row.status}, kept_at = ${change.status === 'kept' ? now() : row.kept_at}
			where id = ${id}`
		this.stackChanged()
		return true
	}

	answerStack(input: {
		id: number
		actionId: string
		note: string | null
		name: string
	}):
		| { ok: true; author: CrewKey; body: string; wake: boolean }
		| { ok: false; status: 404 | 409; error: string } {
		const row = this.sql<StackRow>`
			select * from stack_item
			where id = ${input.id}`[0]
		if (!row) return { ok: false, status: 404, error: 'No item with that id' }
		const item = toStackItem(row)
		if (item.status === 'done') {
			return { ok: false, status: 409, error: 'That item is already done' }
		}
		const action =
			item.actions.find((a) => a.id === input.actionId) ??
			(input.actionId === 'done' ? { id: 'done', label: 'Done' } : null)
		if (!action) {
			return { ok: false, status: 404, error: 'That item has no such answer' }
		}
		const at = now()
		this.sql`update stack_item set answer = ${JSON.stringify({
			actionId: action.id,
			label: action.label,
			note: input.note,
			at,
		})}, status = 'done', done_at = ${at} where id = ${item.id}`
		if (item.kind === 'charter' && row.ref !== null) {
			this.sql`
				update charter set status = ${action.id === 'keep' ? 'kept' : 'dropped'}, kept_at = ${action.id === 'keep' ? at : null}
				where id = ${row.ref}`
		}
		this.stackChanged()
		const note = input.note ? ` They added: "${input.note}"` : ''
		return {
			ok: true,
			author: item.author,
			body: `${input.name} answered "${action.label}" to "${item.title}" (${item.kind}).${note}`,
			// An item with choices asked something; a brief or a "know" item
			// only leaves the stack.
			wake: item.actions.length > 0,
		}
	}

	weekly(): WeeklyType {
		return this.state.weekly
	}

	setTimezone(timezone: string) {
		this.setWeekly({ timezone })
	}

	recordBrief(input: { author: CrewKey; title: string; body: string }) {
		const id = this.bringToAdmin({
			author: input.author,
			kind: 'brief',
			title: input.title,
			body: input.body,
			actions: [],
		})
		this.setWeekly({ briefAt: now() })
		return id
	}

	closeMeeting() {
		this.setWeekly({ meetingAt: now() })
	}

	// ---- Internals ----------------------------------------------------------

	private saveTodo(agent: CrewKey, text: string, note: string | null) {
		const { id } = this.sql<{ id: number }>`
			insert into todo (agent, text, note, at)
			values (${agent}, ${text}, ${note}, ${now()})
			returning id`[0]
		return id
	}

	private saveMemory(
		agent: CrewKey,
		text: string,
		playbook: Playbook | null = null
	) {
		const { id } = this.sql<{ id: number }>`
			insert into memory (agent, text, at, kind, domain)
			values (${agent}, ${text}, ${now()}, ${playbook?.kind ?? 'fact'}, ${playbook?.domain ?? null})
			returning id`[0]
		return id
	}

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
			corrected: null,
		}
		this.sql`
			insert into message (id, at, author, author_name, body, routing, card, answer, place, conversation)
			values (${row.id}, ${row.at}, ${row.author}, ${row.author_name}, ${row.body}, ${row.routing}, ${row.card}, ${row.answer}, ${row.place}, ${row.conversation})`
		const message = toMessage(row)
		if (message.place === 'room') this.push({ type: 'message', message })
		return message
	}

	// The admin's "..." messages since their last message that was not one.
	private stackedBodies(author: string) {
		const rows = this.sql<{
			body: string
			routing: string | null
		}>`
			select body, routing from message
			where author = ${author}
			order by at desc, id desc
			limit 20`
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
		return this.sql<MessageRow>`select * from (
					select * from message where place = 'room' order by at desc, id desc limit ${limit}
				) order by at, id`
	}

	private workspaceText(agent: CrewKey) {
		const ws = this.workspace(agent)
		const todos = ws.todos
			.map(
				(t) =>
					`- [${t.id}]${t.done ? ' (done)' : ''} ${t.text}${t.note ? ` — ${t.note}` : ''}`
			)
			.join('\n')
		const memory = ws.memory
			.map(
				(m) =>
					`- [${m.id}]${m.kind === 'fact' ? '' : ` (${m.kind}${m.domain ? `, ${m.domain}` : ''})`} ${m.text}`
			)
			.join('\n')
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

	private setWeekly(change: Partial<WeeklyType>) {
		this.setState({
			...this.state,
			weekly: { ...this.state.weekly, ...change },
		})
	}

	private setStatus(agent: CrewKey, status: AgentStatusType) {
		this.setState({
			...this.state,
			statuses: { ...this.state.statuses, [agent]: status },
		})
	}

	// Labels the CLEF decision behind each message this run received with
	// whether the run posted anything. "silent" is a weak sign that the
	// message did not need the agent.
	private recordOutcomes(agent: CrewKey, since: string) {
		const { posted } = this.sql<{ posted: number }>`
			select count(*) as posted from message
			where author = ${agent} and place = 'room' and at >= ${since}`[0]
		const decisions = this.sql<{
			message_id: string
			outcomes: string
		}>`select message_id, outcomes from run_message
				join clef_decision using (message_id) where agent = ${agent}`
		this.sql`delete from run_message where agent = ${agent}`
		for (const decision of decisions) {
			const outcomes = JSON.parse(decision.outcomes) as Record<string, string>
			if (outcomes[agent]) continue
			outcomes[agent] = posted > 0 ? 'posted' : 'silent'
			this.sql`
				update clef_decision set outcomes = ${JSON.stringify(outcomes)}
				where message_id = ${decision.message_id}`
		}
	}

	private takeAgentWake() {
		const hourAgo = new Date(Date.now() - 3_600_000).toISOString()
		this.sql`delete from agent_wake where at < ${hourAgo}`
		const { count } = this.sql<CountRow>`
			select count(*) as count from agent_wake`[0]
		if (count >= AGENT_WAKES_PER_HOUR) return false
		this.sql`insert into agent_wake (at) values (${now()})`
		return true
	}

	// An agent's own edit: it goes in the receipt that ends its run.
	private workspaceEdited(agent: CrewKey, what: string) {
		this.sql`
			insert into edit_log (agent, what, at)
			values (${agent}, ${what}, ${now()})`
		this.push({ type: 'workspace', agent })
	}

	// A room run that changed the agent's workspace ends with a receipt in
	// the room, built from the edits it made rather than from its own account.
	private postReceipt(agent: CrewKey, since: string) {
		const edits = this.sql<{
			what: string
		}>`
			select what from edit_log
			where agent = ${agent} and at >= ${since}
			order by at`
		if (!edits.length) return
		this.insert({
			author: agent,
			authorName: crew[agent].name,
			body: `👍 ${edits.length === 1 ? 'one edit' : `${edits.length} edits`}: ${edits.map((edit) => edit.what).join('; ')}`,
			routing: null,
			card: null,
			place: 'room',
			conversation: TEAM,
		})
	}

	private openStackCount() {
		const { count } = this.sql<CountRow>`
			select count(*) as count from stack_item
			where status = 'open'`[0]
		return count
	}

	private stackChanged() {
		this.setState({ ...this.state, stackCount: this.openStackCount() })
		this.push({ type: 'stack' })
	}

	// True while Riker and Data have spoken fewer than BRIDGE_TURNS times in a
	// row since the last message from an admin.
	private bridgeTurnLeft() {
		const recent = this.sql<{
			author: string
		}>`
			select author from message
			where place = 'room'
			order by at desc, id desc
			limit ${BRIDGE_TURNS}`
		return (
			recent.length < BRIDGE_TURNS ||
			recent.some((row) => !isCrewKey(row.author))
		)
	}

	// The bridge's shared memory of the admin, and what waits in their stack.
	private bridgeText() {
		const { items, charter } = this.stack()
		const kept = charter
			.filter((entry) => entry.status === 'kept')
			.map((entry) => `- [${entry.kind} ${entry.id}] ${entry.text}`)
			.join('\n')
		const proposed = charter
			.filter((entry) => entry.status === 'proposed')
			.map((entry) => `- [${entry.kind} ${entry.id}] ${entry.text}`)
			.join('\n')
		const open = items
			.filter((item) => item.status === 'open')
			.map(
				(item) =>
					`- [${item.kind}, from ${crew[item.author].name}] ${item.title}`
			)
			.join('\n')
		const answered = items
			.filter((item) => item.answer)
			.slice(0, 10)
			.map(
				(item) =>
					`- ${item.title}: "${item.answer?.label}"${item.answer?.note ? ` — ${item.answer.note}` : ''}`
			)
			.join('\n')
		const weekly = this.weekly()
		const meeting = meetingDue(weekly)
			? `The weekly meeting is due: Riker wrote the brief at ${stamp(weekly.briefAt ?? now())}, and the admin has not met with Riker since. It comes before anything else. Something truly critical becomes item 1 of the meeting; it does not replace the meeting.`
			: `The last weekly meeting was ${weekly.meetingAt ? stamp(weekly.meetingAt) : 'never'}.`
		return [
			'## The charter: what the admin has told the bridge about themselves',
			kept || '(nothing kept yet)',
			'Proposed, waiting for the admin:',
			proposed || '(none)',
			"## The admin's stack",
			`Open:\n${open || '(empty)'}`,
			`Recently answered:\n${answered || '(none)'}`,
			'## The weekly cycle',
			`${meeting} The admin's time zone is ${weekly.timezone}.`,
		].join('\n\n')
	}

	private push(event: RoomEvent) {
		this.broadcast(JSON.stringify(event))
	}
}

function sanitize(routing: RoutingType): RoutingType {
	const agents = routing.agents.filter((key) => crew[key].active)
	if (routing.kind !== 'route') return { ...routing, agents: [] }
	return agents.length
		? { ...routing, agents }
		: { kind: 'room', agents: [], by: routing.by }
}

// The part of a routing that CLEF decides, with agents in a fixed order, so
// two labels compare equal as strings.
function labelOf(routing: RoutingType) {
	return JSON.stringify({
		kind: routing.kind,
		agents: routing.agents.toSorted(),
	})
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
