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
	endsWithEllipsis,
	type ActionType,
	type AgentStatusType,
	type RoomStateType,
	type CrewKey,
	type CrewMessageType,
	type CardType,
	type CharterEntryType,
	type EnterpriseType,
	type WeeklyType,
	type MemoryType,
	type OpenItemType,
	type RoomEvent,
	type RoomSnapshotType,
	type RoutingType,
	type WorkspaceType,
} from '../../shared/crew'
import { clefPrompt, parseClefReply, type ClefExample } from './clef'

// The room's one instance. Renaming it starts a fresh room: its tables are
// created once, so a room made before a schema change keeps the old ones.
export const ROOM = 'crew'

// The Flue conversation a fleet agent's room runs use. A 1:1 chat with an
// agent uses `dm-<admin uid>` instead.
export const TEAM = 'team'
// Riker and Data's one conversation: everything reaches them here, from the
// Conference Room and from the Enterprise thread, so neither runs twice at
// once and each keeps one memory of the day.
export const BRIDGE = 'bridge'

export const conversationOf = (agent: CrewKey) =>
	bridgeKeys.includes(agent) ? BRIDGE : TEAM

type Place = CrewMessageType['place']

export type Wake = {
	agent: CrewKey
	body: string
	messageId: string
	place: 'room' | 'bridge'
}

type MessageRow = {
	id: string
	at: string
	author: string
	author_name: string
	body: string
	routing: string | null
	card: string | null
	answer: string | null
	place: Place
	conversation: string
	corrected: string | null
	receipt: number
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
// Done to-dos stay in view this long.
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

// One instance, named ROOM, holds the Conference Room and the Enterprise
// thread, each agent's workspace (to-dos, memory, open items), the charter,
// CLEF's decision log, and the admin's WebSockets. It is an Agents SDK Agent with no model: browsers
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
		enterpriseOpen: 0,
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
				corrected text,
				-- 1 for the room's receipt of an agent's edits, not the agent speaking.
				receipt integer not null default 0
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
			-- How far an agent has read each timeline ("room" or "bridge").
			create table if not exists cursor (
				agent text not null,
				place text not null,
				at text,
				pending_at text,
				primary key (agent, place)
			);
			create table if not exists seen (
				uid text not null,
				place text not null,
				at text not null,
				primary key (uid, place)
			);
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
			-- When the admin started the meeting for each week's brief.
			create table if not exists meeting (
				brief_at text primary key,
				started_at text not null
			);
			-- Data's pre-meeting report for each week's brief.
			create table if not exists meeting_report (
				brief_at text primary key,
				message_id text not null
			);
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
		`
	}

	// ---- The timeline -------------------------------------------------------

	snapshot(uid: string): RoomSnapshotType {
		return {
			...this.state,
			messages: this.latestRows('room', SNAPSHOT_MESSAGES).map(toMessage),
			seenAt: this.seenAt(uid, 'room'),
		}
	}

	enterprise(uid: string): EnterpriseType {
		return {
			messages: this.latestRows('bridge', SNAPSHOT_MESSAGES).map(toMessage),
			charter: this.charter(),
			seenAt: this.seenAt(uid, 'bridge'),
			meetingStartedAt: this.meetingStartedAt(),
		}
	}

	markSeen(uid: string, place: 'room' | 'bridge') {
		this.sql`
			insert into seen (uid, place, at)
			values (${uid}, ${place}, ${now()})
			on conflict (uid, place) do update set at = excluded.at`
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
		// The place the admin picked from the chip before sending, if any.
		routing: RoutingType | null
	}): Promise<{ message: CrewMessageType; wake: Array<Wake> }> {
		const fixed = fixedRouting(input.body)
		// Asked even when the admin picked a place, so the pick is a label.
		const predicted = fixed ?? (await this.classify(input.body))
		const routing =
			fixed ?? (input.routing ? sanitize(input.routing) : predicted)
		const author = adminAuthor(input.uid)
		const stacked =
			routing.kind === 'route' ? this.stackedBodies(author, 'room') : []
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
		const wake = routing.agents.map(
			(agent): Wake => ({ agent, body, messageId: message.id, place: 'room' })
		)
		return { message, wake }
	}

	// The admin writing in the Enterprise thread. It goes to Riker unless it
	// names Data; a trailing "..." waits for the next message, as in the room.
	postToEnterprise(input: { uid: string; name: string; body: string }): {
		message: CrewMessageType
		wake: Array<Wake>
	} {
		const author = adminAuthor(input.uid)
		const named = mentionedCrew(input.body).filter((key) =>
			bridgeKeys.includes(key)
		)
		const routing: RoutingType = endsWithEllipsis(input.body)
			? { kind: 'stack', agents: [], by: 'rule' }
			: {
					kind: 'route',
					agents: named.length ? named : ['riker'],
					by: 'rule',
				}
		const stacked =
			routing.kind === 'route' ? this.stackedBodies(author, 'bridge') : []
		const message = this.insert({
			author,
			authorName: input.name,
			body: input.body,
			routing,
			card: null,
			place: 'bridge',
			conversation: BRIDGE,
		})
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map(
			(agent): Wake => ({
				agent,
				body,
				messageId: message.id,
				place: 'bridge',
			})
		)
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
			.map(
				(agent): Wake => ({
					agent,
					body: row.body,
					messageId: row.id,
					place: 'room',
				})
			)
		return { ok: true, message, wake }
	}

	postFromAgent(input: {
		agent: CrewKey
		body: string
		card: CardType | null
		place: Place
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
		if (input.card) {
			this.push({ type: 'workspace', agent: input.agent })
			if (input.place === 'bridge') this.enterpriseChanged()
		}
		const wake: Array<Wake> = []
		const place = input.place
		if (place === 'dm') return { message, wake }
		// In the Enterprise thread only Riker and Data answer; Riker carries
		// anything for the fleet to the Conference Room himself.
		const reachable = mentionedCrew(input.body).filter(
			(agent) =>
				agent !== input.agent &&
				crew[agent].active &&
				(place === 'room' || bridgeKeys.includes(agent))
		)
		for (const agent of reachable) {
			const bridgeTalk =
				bridgeKeys.includes(agent) && bridgeKeys.includes(input.agent)
			if (bridgeTalk ? !this.bridgeTurnLeft(place) : !this.takeAgentWake()) {
				continue
			}
			wake.push({ agent, body: input.body, messageId: message.id, place })
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
		const ref = message.card.ref
		if (message.card.kind === 'charter' && ref) {
			const keep = action.id === 'keep'
			this.sql`
				update charter set status = ${keep ? 'kept' : 'dropped'}, kept_at = ${keep ? at : null}
				where id = ${ref}`
			this.push({ type: 'enterprise' })
		}
		this.push({ type: 'message', message: { ...message, answer } })
		this.push({ type: 'workspace', agent })
		if (message.place === 'bridge') this.enterpriseChanged()
		const what =
			message.card.kind === 'change'
				? 'proposed change'
				: message.card.kind === 'question'
					? 'question'
					: `${message.card.kind} card`
		return {
			ok: true,
			agent,
			conversation: row.conversation,
			body: `${input.name} answered "${action.label}" to your ${what}: ${subject}`,
		}
	}

	// ---- Agent runs ---------------------------------------------------------

	// What an agent should wake up knowing: its workspace, the Conference Room
	// and, for Riker and Data, the charter and the Enterprise thread. A run in
	// a shared timeline reads everything since its last finished run there; a
	// 1:1 chat reads the latest messages and moves no cursor. Called once for
	// each message a run receives: messages that reach a busy agent join it.
	agentContext(
		agent: CrewKey,
		conversation: string,
		messageId: string | null
	): string {
		const shared = conversation === TEAM || conversation === BRIDGE
		if (shared) {
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
		if (!shared) {
			sections.push(
				'## The Conference Room, latest messages',
				roomText(this.latestRows('room', 15)) || '(empty)'
			)
		} else {
			sections.push(...this.unread(agent, 'room', 'The Conference Room'))
			if (conversation === BRIDGE) {
				sections.push(...this.unread(agent, 'bridge', 'The Enterprise thread'))
			}
		}
		return sections.join('\n\n')
	}

	finishRun(agent: CrewKey, conversation: string) {
		if (conversation !== TEAM && conversation !== BRIDGE) return
		this.sql`
			update cursor set at = coalesce(pending_at, at), pending_at = null
			where agent = ${agent}`
		const since = this.state.statuses[agent]?.since
		if (since) {
			this.recordOutcomes(agent, since)
			this.postReceipt(
				agent,
				since,
				conversation === BRIDGE ? 'bridge' : 'room'
			)
		}
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	// A run that failed or was aborted never reaches finishRun.
	failRun(agent: CrewKey) {
		this.sql`delete from run_message where agent = ${agent}`
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	recentRoom(limit: number): string {
		return roomText(this.latestRows('room', limit)) || '(empty)'
	}

	// ---- Workspaces ---------------------------------------------------------

	// `uid` is the admin reading it: they see room cards and the cards from
	// their own 1:1 chat. Without it (the agent's own context), every card.
	workspace(agent: CrewKey, uid?: string): WorkspaceType {
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
				and (${uid ?? null} is null or place = 'room' or conversation = ${`dm-${uid}`})
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

	// ---- The Enterprise: cards for the admin, the charter, the weekly cycle

	charter(): Array<CharterEntryType> {
		return this.sql<CharterRow>`
			select * from charter
			where status != 'dropped'
			order by kind, id`.map(toCharter)
	}

	// Riker or Data bringing the admin something: a card in the Enterprise
	// thread. A card with no actions (know, brief) has nothing to answer.
	bringToAdmin(input: {
		author: CrewKey
		kind: CardType['kind']
		title: string
		body: string
		actions: Array<ActionType>
		ref?: number
	}) {
		const message = this.insert({
			author: input.author,
			authorName: crew[input.author].name,
			body: input.body,
			routing: null,
			card: {
				kind: input.kind,
				title: input.title,
				actions: input.actions,
				ref: input.ref ?? null,
			},
			place: 'bridge',
			conversation: BRIDGE,
		})
		this.push({ type: 'workspace', agent: input.author })
		this.enterpriseChanged()
		return message.id
	}

	// A principle or lesson waits as a card until the admin keeps it.
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
		this.push({ type: 'enterprise' })
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
		this.push({ type: 'enterprise' })
		return true
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

	// The admin starting the weekly meeting: Riker takes it from here, and the
	// meeting counts as started until he closes it.
	startMeeting(input: { uid: string; name: string }) {
		const start = this.recordMeetingStart()
		if (!start.started) return null
		return {
			...this.postToEnterprise({
				...input,
				body: "Let's have our weekly meeting.",
			}),
			needsReport: start.needsReport,
		}
	}

	// Riker calls this too, when the admin asks for the meeting somewhere
	// other than the start button. `needsReport` is true only for the call
	// that starts the meeting, and only when Data has not filed a report for
	// this week's brief, so a second start never asks for a second report.
	recordMeetingStart(): { started: boolean; needsReport: boolean } {
		const { briefAt } = this.weekly()
		if (!briefAt || !meetingDue(this.weekly())) {
			return { started: false, needsReport: false }
		}
		const inserted = this.sql`
			insert or ignore into meeting (brief_at, started_at)
			values (${briefAt}, ${now()})
			returning brief_at`
		this.push({ type: 'enterprise' })
		const filed = this.sql`
			select 1 from meeting_report where brief_at = ${briefAt}`
		return {
			started: true,
			needsReport: inserted.length > 0 && filed.length === 0,
		}
	}

	// Data's pre-meeting report: a folded card in the Enterprise thread, and
	// the one report for this week's meeting.
	fileReport(input: { title: string; body: string }) {
		const messageId = this.bringToAdmin({
			author: 'data',
			kind: 'report',
			title: input.title,
			body: input.body,
			actions: [],
		})
		const { briefAt } = this.weekly()
		if (briefAt) {
			this.sql`
				insert or replace into meeting_report (brief_at, message_id)
				values (${briefAt}, ${messageId})`
		}
		return messageId
	}

	closeMeeting() {
		this.setWeekly({ meetingAt: now() })
		this.push({ type: 'enterprise' })
	}

	private meetingStartedAt() {
		const { briefAt } = this.weekly()
		if (!briefAt || !meetingDue(this.weekly())) return null
		return (
			this.sql<{ started_at: string }>`
				select started_at from meeting where brief_at = ${briefAt}`[0]
				?.started_at ?? null
		)
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
		place: Place
		conversation: string
		receipt?: boolean
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
			receipt: input.receipt ? 1 : 0,
		}
		this.sql`
			insert into message (id, at, author, author_name, body, routing, card, answer, place, conversation, receipt)
			values (${row.id}, ${row.at}, ${row.author}, ${row.author_name}, ${row.body}, ${row.routing}, ${row.card}, ${row.answer}, ${row.place}, ${row.conversation}, ${row.receipt})`
		const message = toMessage(row)
		if (message.place !== 'dm') this.push({ type: 'message', message })
		return message
	}

	// The admin's "..." messages in this timeline since their last message
	// there that was not one.
	private stackedBodies(author: string, place: 'room' | 'bridge') {
		const rows = this.sql<{
			body: string
			routing: string | null
		}>`
			select body, routing from message
			where author = ${author} and place = ${place}
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

	private latestRows(place: 'room' | 'bridge', limit: number) {
		return this.sql<MessageRow>`select * from (
					select * from message where place = ${place} order by at desc, id desc limit ${limit}
				) order by at, id`
	}

	// The messages in one timeline since the agent last finished a run there,
	// as a context section. The cursor moves when the run finishes.
	private unread(agent: CrewKey, place: 'room' | 'bridge', name: string) {
		const cursor = this.sql<{
			at: string | null
		}>`select at from cursor where agent = ${agent} and place = ${place}`[0]?.at
		const rows = cursor
			? this.sql<MessageRow>`select * from (
							select * from message where place = ${place} and at > ${cursor} order by at desc limit 60
						) order by at, id`
			: this.latestRows(place, 30)
		const last = rows.at(-1)?.at
		if (last) {
			this.sql`
				insert into cursor (agent, place, pending_at) values (${agent}, ${place}, ${last})
				on conflict (agent, place) do update set pending_at = excluded.pending_at`
		}
		return [
			cursor ? `## ${name} since your last run` : `## ${name}, latest messages`,
			roomText(rows) || '(nothing new)',
		]
	}

	private seenAt(uid: string, place: 'room' | 'bridge') {
		return (
			this.sql<{ at: string }>`
				select at from seen where uid = ${uid} and place = ${place}`[0]?.at ??
			null
		)
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
			where author = ${agent} and place in ('room', 'bridge') and at >= ${since}`[0]
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

	// A run that changed the agent's workspace ends with a receipt in its
	// timeline, built from the edits it made rather than from its own account.
	private postReceipt(agent: CrewKey, since: string, place: 'room' | 'bridge') {
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
			place,
			conversation: conversationOf(agent),
			receipt: true,
		})
	}

	// Cards in the Enterprise thread that wait on the admin's answer.
	private openCards() {
		return this.sql<MessageRow>`
			select * from message
			where place = 'bridge' and card is not null and answer is null
				and json_array_length(card, '$.actions') > 0
			order by at`.map(toMessage)
	}

	private enterpriseChanged() {
		this.setState({ ...this.state, enterpriseOpen: this.openCards().length })
	}

	// True while Riker and Data have spoken fewer than BRIDGE_TURNS times in a
	// row in this timeline since the admin last wrote there. Receipts are not
	// turns.
	private bridgeTurnLeft(place: 'room' | 'bridge') {
		const recent = this.sql<{
			author: string
		}>`
			select author from message
			where place = ${place} and receipt = 0
			order by at desc, id desc
			limit ${BRIDGE_TURNS}`
		return (
			recent.length < BRIDGE_TURNS ||
			recent.some((row) => !isCrewKey(row.author))
		)
	}

	// The bridge's shared memory of the admin, and what waits on them.
	private bridgeText() {
		const charter = this.charter()
		const kept = charter
			.filter((entry) => entry.status === 'kept')
			.map((entry) => `- [${entry.kind} ${entry.id}] ${entry.text}`)
			.join('\n')
		const proposed = charter
			.filter((entry) => entry.status === 'proposed')
			.map((entry) => `- [${entry.kind} ${entry.id}] ${entry.text}`)
			.join('\n')
		const open = this.openCards()
			.map(
				(message) =>
					`- [${message.card?.kind}, from ${message.authorName}] ${message.card?.title ?? message.body}`
			)
			.join('\n')
		const answered = this.sql<MessageRow>`
			select * from message
			where place = 'bridge' and answer is not null
			order by at desc
			limit 10`
			.map(toMessage)
			.map(
				(message) =>
					`- ${message.card?.title ?? message.body}: "${message.answer?.label}"`
			)
			.join('\n')
		const weekly = this.weekly()
		const startedAt = this.meetingStartedAt()
		const meeting = startedAt
			? `The weekly meeting is in progress in the Enterprise thread: the admin started it at ${stamp(startedAt)}. Go through the agenda one item at a time, and call close_meeting with the minutes when it is done.`
			: meetingDue(weekly)
				? `The weekly meeting is due: Riker wrote the brief at ${stamp(weekly.briefAt ?? now())}, and the admin has not met with Riker since. It comes before anything else. Something truly critical becomes item 1 of the meeting; it does not replace the meeting.`
				: `The last weekly meeting was ${weekly.meetingAt ? stamp(weekly.meetingAt) : 'never'}.`
		return [
			'## The charter: what the admin has told the bridge about themselves',
			kept || '(nothing kept yet)',
			'Proposed, waiting for the admin:',
			proposed || '(none)',
			'## Cards in the Enterprise thread',
			`Waiting on the admin:\n${open || '(none)'}`,
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
