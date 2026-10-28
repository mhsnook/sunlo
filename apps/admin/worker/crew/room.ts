import { Agent } from 'agents'
import {
	adminAuthor,
	crew,
	crewKeys,
	displayName,
	endsWithEllipsis,
	fixedRouting,
	isCrewKey,
	roomKeys,
	roomNames,
	roomOfPlace,
	meetingDue,
	mentionedCrew,
	placeOf,
	principalOf,
	roomMembers,
	roomOf,
	SITREP_MAX,
	type ActionType,
	type AgentStatusType,
	type CardType,
	type CharterEntryType,
	type CommandType,
	type CommonKnowledgeType,
	type CrewKey,
	type CrewMessageType,
	type RoomKey,
	type MemoryType,
	type OpenItemType,
	type PlaceType,
	type RoomEvent,
	type RoomSnapshotType,
	type RoomStateType,
	type RoomThreadType,
	type RoutingType,
	type SitrepType,
	type WeeklyType,
	type WorkspaceType,
} from '../../shared/crew'
import { briefingText, timelineText, type UnreadTimeline } from './briefing'
import { clefPrompt, parseClefReply, type ClefExample } from './clef'

// The room's one instance. Renaming it starts a fresh room and leaves the
// production data behind: change the schema with an in-place migration in
// the constructor instead.
export const ROOM = 'crew'

// Every agent's one Flue conversation: its running memory, which covers the
// Common Room and its own room, so it never runs twice at once.
export const CONVERSATION = 'memory'

export type Wake = {
	agent: CrewKey
	body: string
	messageId: string
	place: PlaceType
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
	place: PlaceType
	parent: string | null
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

type SitrepRow = {
	text: string
	by: string
	by_name: string
	at: string
}

// A Situation Report line from before the report was one document.
type SitrepTrackRow = {
	agent: string
	track: string
	text: string
	by: string
	by_name: string
	at: string
}

const DISMISS = { id: 'dismiss', label: 'Dismissed' }

type IdRow = { id: number }
type CountRow = { count: number }

type Playbook = { kind: 'metric' | 'chart'; domain: string | null }

// An agent's mention of an agent from another room wakes it, at most this
// many times an hour, so two agents cannot keep waking each other.
const AGENT_WAKES_PER_HOUR = 6
// A room's principal and associate may talk back and forth this many turns in a row
// before the admin says something; a discussion longer than that waits.
const ROOM_TURNS = 8
const SNAPSHOT_MESSAGES = 200
const CLEF_EXAMPLES_SHOWN = 20

const now = () => new Date().toISOString()
// Done to-dos stay in view this long.
const twoWeeksAgo = () => new Date(Date.now() - 14 * 86_400_000).toISOString()

const noOpenCards = (): Record<RoomKey, number> => ({
	command: 0,
	product: 0,
	library: 0,
	learnership: 0,
})

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
	receipt: row.receipt === 1,
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

// One instance, named ROOM, holds the Common Room and each subject's room,
// each agent's workspace (to-dos, memory, open items), the charter, CLEF's
// decision log, and the admin's WebSockets. It is an Agents SDK Agent with
// no model: browsers connect with useAgent, and its state (each agent's
// status) syncs to them. Flue's agent Durable Objects keep only their own
// conversations.
export class CrewRoom extends Agent<Env, RoomStateType> {
	initialState: RoomStateType = {
		statuses: {},
		weekly: {
			briefAt: null,
			meetingAt: null,
			timezone: 'America/New_York',
		},
		openCards: noOpenCards(),
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
				-- "room" for the Common Room, "room:<room key>" for a subject's room.
				place text not null,
				-- The message this one replies to in a side-thread. Unused so far.
				parent text,
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
			-- How far an agent has read each timeline (a message's place).
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
			create table if not exists common_knowledge (
				id integer primary key autoincrement,
				text text not null,
				at text not null
			);
			-- One line per crew member and track; Riker's line is his note.
			-- One row, id 1: the Situation Report, which Riker and the admin write.
			create table if not exists situation_report (
				id integer primary key check (id = 1),
				text text not null,
				by text not null,
				by_name text not null,
				at text not null
			);
			-- Data's pre-meeting report for each week's brief.
			create table if not exists meeting_report (
				brief_at text primary key,
				message_id text not null
			);
			-- The messages delivered to an agent's current run.
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
		this.migrateToRooms()
	}

	// The open-card counts in the synced state are derived, so a room that
	// starts with state from an older shape gets them recounted.
	onStart() {
		this.setState({
			statuses: this.state.statuses,
			weekly: this.state.weekly,
			openCards: this.countOpenCards(),
		})
		return Promise.resolve()
	}

	// The room before there were subject rooms: the Enterprise thread
	// ("bridge"), cards from 1:1 chats ("dm"), the agents Product (now
	// Geordi) and Growth (now Guinan), and Monitor and Moderator, who are
	// gone. Safe to run on every start: each step finds nothing to change
	// once it has run.
	private migrateToRooms() {
		const columns = new Set(
			this.sql<{ name: string }>`
				select name from pragma_table_info('message')`.map((c) => c.name)
		)
		if (!columns.has('parent')) {
			this.sql`alter table message add column parent text`
		}
		if (columns.has('conversation')) {
			this.sql`alter table message drop column conversation`
		}
		this.renameAgent('product', 'geordi')
		this.renameAgent('growth', 'guinan')
		this.sql`update message set place = 'room:command' where place = 'bridge'`
		const dmAuthors = this.sql<{ author: string }>`
			select distinct author from message where place = 'dm'`
		for (const { author } of dmAuthors) {
			const place = isCrewKey(author) ? placeOf(roomOf(author)) : 'room'
			this.sql`
				update message set place = ${place}
				where place = 'dm' and author = ${author}`
		}
		this.sql`
			update or replace cursor set place = 'room:command' where place = 'bridge'`
		this.sql`
			update or replace seen set place = 'room:command' where place = 'bridge'`
		this.mergeSitrepIntoOneReport()
	}

	// The Situation Report kept a line per agent and track; now it is one
	// document. Riker's note opens it, then each room's lines follow under
	// the room's name. Monitor's and Moderator's lines have no room and go.
	private mergeSitrepIntoOneReport() {
		const old = this.sql<{ name: string }>`
			select name from sqlite_master where type = 'table' and name = 'sitrep'`
		if (!old.length) return
		const rows = this.sql<SitrepTrackRow>`select * from sitrep order by at`
		const roomOfOldAgent: Record<string, RoomKey> = {
			product: 'product',
			library: 'library',
			growth: 'learnership',
		}
		const note = rows.find((row) => row.agent === 'riker')?.text
		const sections = roomKeys.flatMap((room) => {
			const lines = rows.filter((row) => roomOfOldAgent[row.agent] === room)
			return lines.length
				? [
						`**${roomNames[room]}**\n${lines.map((row) => `- ${row.track}: ${row.text}`).join('\n')}`,
					]
				: []
		})
		const text = [note, ...sections].filter(Boolean).join('\n\n')
		const latest = rows.at(-1)
		const exists = this.sql`select 1 from situation_report`
		if (text && latest && !exists.length) {
			const renamed = (
				{ product: 'geordi', growth: 'guinan' } as Record<string, CrewKey>
			)[latest.by]
			this.sql`
				insert into situation_report (id, text, by, by_name, at)
				values (1, ${text}, ${renamed ?? latest.by}, ${renamed ? displayName(renamed) : latest.by_name}, ${latest.at})`
		}
		this.sql`drop table sitrep`
	}

	// Moves everything an agent owns, wrote or was routed to onto a new key.
	private renameAgent(from: string, to: CrewKey) {
		const name = displayName(to)
		const [oldKey, newKey] = [JSON.stringify(from), JSON.stringify(to)]
		const quoted = `%${oldKey}%`
		this.sql`
			update message set author = ${to}, author_name = ${name}
			where author = ${from}`
		this.sql`
			update message set
				routing = replace(routing, ${oldKey}, ${newKey}),
				corrected = replace(corrected, ${oldKey}, ${newKey})
			where routing like ${quoted} or corrected like ${quoted}`
		this.sql`
			update clef_decision set
				predicted = replace(predicted, ${oldKey}, ${newKey}),
				final = replace(final, ${oldKey}, ${newKey}),
				corrected = replace(corrected, ${oldKey}, ${newKey}),
				outcomes = replace(outcomes, ${oldKey}, ${newKey})
			where predicted like ${quoted} or final like ${quoted}
				or corrected like ${quoted} or outcomes like ${quoted}`
		this.sql`update todo set agent = ${to} where agent = ${from}`
		this.sql`update memory set agent = ${to} where agent = ${from}`
		this.sql`update open_item set agent = ${to} where agent = ${from}`
		this.sql`update edit_log set agent = ${to} where agent = ${from}`
		this
			.sql`update or replace run_message set agent = ${to} where agent = ${from}`
		this.sql`update or replace cursor set agent = ${to} where agent = ${from}`
	}

	// ---- The timelines ------------------------------------------------------

	// The Common Room, with the room's synced state.
	snapshot(uid: string): RoomSnapshotType {
		return {
			statuses: this.state.statuses,
			weekly: this.state.weekly,
			openCards: this.countOpenCards(),
			messages: this.latestRows('room', SNAPSHOT_MESSAGES).map(toMessage),
			seenAt: this.seenAt(uid, 'room'),
		}
	}

	thread(uid: string, room: RoomKey): RoomThreadType {
		const place = placeOf(room)
		return {
			messages: this.latestRows(place, SNAPSHOT_MESSAGES).map(toMessage),
			seenAt: this.seenAt(uid, place),
		}
	}

	command(): CommandType {
		return {
			charter: this.charter(),
			meetingStartedAt: this.meetingStartedAt(),
		}
	}

	markSeen(uid: string, place: PlaceType) {
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

	// The admin writing in the Common Room.
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
		})
		this.sql`insert into clef_decision (message_id, text, predicted, final, at)
			values (${message.id}, ${input.body}, ${labelOf(predicted)}, ${labelOf(routing)}, ${message.at})`
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map(
			(agent): Wake => ({ agent, body, messageId: message.id, place: 'room' })
		)
		return { message, wake }
	}

	// The admin writing in a subject's room. It goes to the principal unless
	// it names the room's associate; a crew member from another room is not
	// woken here, so the principal hears it and takes it to the Common Room.
	// A trailing "..." waits for the next message, as in the Common Room.
	postToRoom(input: {
		uid: string
		name: string
		room: RoomKey
		body: string
	}): { message: CrewMessageType; wake: Array<Wake> } {
		const place = placeOf(input.room)
		const author = adminAuthor(input.uid)
		const members = roomMembers(input.room)
		const named = mentionedCrew(input.body).filter((key) =>
			members.includes(key)
		)
		const awake = (named.length ? named : [principalOf(input.room)]).filter(
			(key) => crew[key].active
		)
		const routing: RoutingType = endsWithEllipsis(input.body)
			? { kind: 'stack', agents: [], by: 'rule' }
			: awake.length
				? { kind: 'route', agents: awake, by: 'rule' }
				: { kind: 'room', agents: [], by: 'rule' }
		const stacked =
			routing.kind === 'route' ? this.stackedBodies(author, place) : []
		const message = this.insert({
			author,
			authorName: input.name,
			body: input.body,
			routing,
			card: null,
			place,
		})
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map(
			(agent): Wake => ({ agent, body, messageId: message.id, place })
		)
		return { message, wake }
	}

	// The admin says, after sending, where a Common Room message should have
	// gone. The correction becomes a CLEF label, and agents it names that the
	// message and earlier corrections did not wake are woken now.
	correct(input: {
		messageId: string
		uid: string
		routing: RoutingType
	}):
		| { ok: true; message: CrewMessageType; wake: Array<Wake> }
		| { ok: false; status: 404; error: string } {
		const row = this.sql<MessageRow>`
			select * from message
			where id = ${input.messageId} and author = ${adminAuthor(input.uid)}
				and place = 'room'`[0]
		if (!row?.routing) {
			return {
				ok: false,
				status: 404,
				error: 'You sent no Common Room message with that id',
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

	// An agent posts in the Common Room or in its own room. Its @mentions wake
	// agents there: in a subject's room only that room's members answer, and
	// the principal carries anything for another room to the Common Room.
	postFromAgent(input: {
		agent: CrewKey
		body: string
		card: CardType | null
		place: PlaceType
	}): { message: CrewMessageType; wake: Array<Wake> } {
		const message = this.insert({
			author: input.agent,
			authorName: displayName(input.agent),
			body: input.body,
			routing: null,
			card: input.card,
			place: input.place,
		})
		if (input.card) {
			this.push({ type: 'workspace', agent: input.agent })
			this.openCardsChanged()
		}
		const placeRoom = roomOfPlace(input.place)
		const reachable = mentionedCrew(input.body).filter(
			(agent) =>
				agent !== input.agent &&
				crew[agent].active &&
				(placeRoom === null || roomOf(agent) === placeRoom)
		)
		const wake: Array<Wake> = []
		for (const agent of reachable) {
			const roommates = roomOf(agent) === roomOf(input.agent)
			if (roommates ? !this.roomTurnLeft(input.place) : !this.takeAgentWake()) {
				continue
			}
			wake.push({
				agent,
				body: input.body,
				messageId: message.id,
				place: input.place,
			})
		}
		return { message, wake }
	}

	// Every card can also be dismissed, with or without feedback, which the
	// agent keeps as a memory so it learns what the admin does not want.
	answer(input: {
		messageId: string
		actionId: string
		feedback: string | null
		name: string
	}):
		| { ok: true; agent: CrewKey; body: string }
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
		const dismissed = input.actionId === DISMISS.id
		const action = dismissed
			? DISMISS
			: message.card.actions.find((a) => a.id === input.actionId)
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
		const day = at.slice(0, 10)
		if (dismissed && input.feedback) {
			this.saveMemory(
				agent,
				`${input.name} dismissed on ${day}: ${subject}. Their feedback: ${input.feedback}`
			)
		} else if (message.card.kind === 'change' && !dismissed) {
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
			this.push({ type: 'command' })
		}
		this.push({ type: 'message', message: { ...message, answer } })
		this.push({ type: 'workspace', agent })
		this.openCardsChanged()
		const what =
			message.card.kind === 'change'
				? 'proposed change'
				: message.card.kind === 'question'
					? 'question'
					: `${message.card.kind} card`
		return {
			ok: true,
			agent,
			body: dismissed
				? `${input.name} dismissed your ${what}: ${subject}${input.feedback ? `\n\nTheir feedback: ${input.feedback}` : ''}`
				: `${input.name} answered "${action.label}" to your ${what}: ${subject}`,
		}
	}

	// ---- Agent runs ---------------------------------------------------------

	// What an agent should wake up knowing: its workspace, the cards in its
	// room, everything new in the Common Room and in its room since its last
	// finished run, and, in the Command room, the charter and the weekly
	// cycle. Called once for each message a run receives: messages that
	// reach a busy agent join its run.
	agentContext(agent: CrewKey, messageId: string | null): string {
		if (this.state.statuses[agent]?.state !== 'working') {
			this.setStatus(agent, { state: 'working', since: now() })
		}
		if (messageId) {
			this.sql`
				insert or ignore into run_message (agent, message_id)
				values (${agent}, ${messageId})`
		}
		const room = roomOf(agent)
		const place = placeOf(room)
		return briefingText({
			now: now(),
			agent,
			commonKnowledge: this.commonKnowledge(),
			sitrep: this.sitrep(),
			workspace: this.workspace(agent),
			cards: {
				waiting: this.openCards(place),
				answered: this.answeredCards(place),
			},
			command:
				room === 'command'
					? {
							charter: this.charter(),
							weekly: this.weekly(),
							meetingStartedAt: this.meetingStartedAt(),
						}
					: null,
			unread: [
				this.unread(agent, 'room', 'common'),
				this.unread(agent, place, 'own'),
			],
		})
	}

	finishRun(agent: CrewKey) {
		this.sql`
			update cursor set at = coalesce(pending_at, at), pending_at = null
			where agent = ${agent}`
		const since = this.state.statuses[agent]?.since
		if (since) {
			const place = this.runPlace(agent)
			this.recordOutcomes(agent, since)
			this.postReceipt(agent, since, place)
		}
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	// A run that failed or was aborted never reaches finishRun.
	failRun(agent: CrewKey) {
		this.sql`delete from run_message where agent = ${agent}`
		this.setStatus(agent, { state: 'idle', since: now() })
	}

	recentRoom(limit: number): string {
		return (
			timelineText(this.latestRows('room', limit).map(toMessage)) || '(empty)'
		)
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

	editMemory(agent: CrewKey, id: number, text: string) {
		const edited = this.sql`
			update memory set text = ${text}
			where id = ${id} and agent = ${agent}
			returning id`
		if (edited.length) this.push({ type: 'workspace', agent })
		return edited.length > 0
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

	// ---- Cards for the admin, the charter, the weekly cycle -----------------

	charter(): Array<CharterEntryType> {
		return this.sql<CharterRow>`
			select * from charter
			where status != 'dropped'
			order by kind, id`.map(toCharter)
	}

	// An agent bringing the admin something: a card in its own room. A card
	// with no actions (know, brief, report) has nothing to answer.
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
			authorName: displayName(input.author),
			body: input.body,
			routing: null,
			card: {
				kind: input.kind,
				title: input.title,
				actions: input.actions,
				ref: input.ref ?? null,
			},
			place: placeOf(roomOf(input.author)),
		})
		this.push({ type: 'workspace', agent: input.author })
		this.openCardsChanged()
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
		this.push({ type: 'command' })
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
		this.push({ type: 'command' })
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
			...this.postToRoom({
				...input,
				room: 'command',
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
		this.push({ type: 'command' })
		const filed = this.sql`
			select 1 from meeting_report where brief_at = ${briefAt}`
		return {
			started: true,
			needsReport: inserted.length > 0 && filed.length === 0,
		}
	}

	// Data's pre-meeting report: a folded card in the Command room, and the
	// one report for this week's meeting.
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

	// Closes the meeting, then posts the minutes and each principal's directive in
	// the Common Room, in that order.
	closeMeeting(input: {
		minutes: string
		directives: Array<{ to: CrewKey; text: string }>
	}): Array<Wake> {
		this.setWeekly({ meetingAt: now() })
		this.push({ type: 'command' })
		const posts = [
			`**Minutes of this week's meeting**\n\n${input.minutes}`,
			...input.directives.map(
				(directive) => `@${directive.to} ${directive.text}`
			),
		]
		return posts.flatMap(
			(body) =>
				this.postFromAgent({
					agent: 'riker',
					body,
					card: null,
					place: 'room',
				}).wake
		)
	}

	commonKnowledge(): Array<CommonKnowledgeType> {
		return this.sql<CommonKnowledgeType>`
			select id, text, at from common_knowledge order by id`
	}

	addCommonKnowledge(text: string) {
		const { id } = this.sql<IdRow>`
			insert into common_knowledge (text, at)
			values (${text}, ${now()})
			returning id`[0]
		this.push({ type: 'common-knowledge' })
		return id
	}

	forgetCommonKnowledge(id: number) {
		const deleted = this.sql`
			delete from common_knowledge where id = ${id} returning id`
		if (deleted.length) this.push({ type: 'common-knowledge' })
		return deleted.length > 0
	}

	editCommonKnowledge(id: number, text: string) {
		const edited = this.sql`
			update common_knowledge set text = ${text} where id = ${id} returning id`
		if (edited.length) this.push({ type: 'common-knowledge' })
		return edited.length > 0
	}

	sitrep(): SitrepType {
		const row = this.sql<SitrepRow>`select * from situation_report`[0]
		return row
			? { text: row.text, by: row.by, byName: row.by_name, at: row.at }
			: null
	}

	// An empty text clears the report. False for a text over SITREP_MAX.
	setSitrep(input: { text: string; by: string; byName: string }) {
		const text = input.text.trim()
		if (text.length > SITREP_MAX) return false
		if (text) {
			this.sql`
				insert into situation_report (id, text, by, by_name, at)
				values (1, ${text}, ${input.by}, ${input.byName}, ${now()})
				on conflict (id) do update set
					text = excluded.text, by = excluded.by,
					by_name = excluded.by_name, at = excluded.at`
		} else {
			this.sql`delete from situation_report`
		}
		this.push({ type: 'sitrep' })
		return true
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
		place: PlaceType
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
			parent: null,
			corrected: null,
			receipt: input.receipt ? 1 : 0,
		}
		this.sql`
			insert into message (id, at, author, author_name, body, routing, card, answer, place, parent, receipt)
			values (${row.id}, ${row.at}, ${row.author}, ${row.author_name}, ${row.body}, ${row.routing}, ${row.card}, ${row.answer}, ${row.place}, ${row.parent}, ${row.receipt})`
		const message = toMessage(row)
		this.push({ type: 'message', message })
		return message
	}

	// The admin's "..." messages in this timeline since their last message
	// there that was not one.
	private stackedBodies(author: string, place: PlaceType) {
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

	private latestRows(place: PlaceType, limit: number) {
		return this.sql<MessageRow>`select * from (
					select * from message where place = ${place} order by at desc, id desc limit ${limit}
				) order by at, id`
	}

	// The messages in one timeline since the agent last finished a run there.
	// The cursor moves when the run finishes.
	private unread(
		agent: CrewKey,
		place: PlaceType,
		which: UnreadTimeline['place']
	): UnreadTimeline {
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
		return { place: which, since: !!cursor, messages: rows.map(toMessage) }
	}

	private seenAt(uid: string, place: PlaceType) {
		return (
			this.sql<{ at: string }>`
				select at from seen where uid = ${uid} and place = ${place}`[0]?.at ??
			null
		)
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

	// Where the run was asked: the place of the latest message it received,
	// or the agent's own room for a run no message started.
	private runPlace(agent: CrewKey): PlaceType {
		return (
			this.sql<{ place: PlaceType }>`
				select message.place from run_message
				join message on message.id = run_message.message_id
				where run_message.agent = ${agent}
				order by message.at desc
				limit 1`[0]?.place ?? placeOf(roomOf(agent))
		)
	}

	// Labels the CLEF decision behind each message this run received with
	// whether the run posted anything. "silent" is a weak sign that the
	// message did not need the agent.
	private recordOutcomes(agent: CrewKey, since: string) {
		const { posted } = this.sql<{ posted: number }>`
			select count(*) as posted from message
			where author = ${agent} and receipt = 0 and at >= ${since}`[0]
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

	// A run that changed the agent's workspace ends with a receipt where it
	// was asked, built from the edits it made rather than from its own account.
	private postReceipt(agent: CrewKey, since: string, place: PlaceType) {
		const edits = this.sql<{
			what: string
		}>`
			select what from edit_log
			where agent = ${agent} and at >= ${since}
			order by at`
		if (!edits.length) return
		this.insert({
			author: agent,
			authorName: displayName(agent),
			body: `👍 ${edits.length === 1 ? 'one edit' : `${edits.length} edits`}: ${edits.map((edit) => edit.what).join('; ')}`,
			routing: null,
			card: null,
			place,
			receipt: true,
		})
	}

	// Cards in one subject's room that wait on the admin's answer.
	private openCards(place: PlaceType) {
		return this.sql<MessageRow>`
			select * from message
			where place = ${place} and card is not null and answer is null
				and json_array_length(card, '$.actions') > 0
			order by at`.map(toMessage)
	}

	private answeredCards(place: PlaceType) {
		return this.sql<MessageRow>`
			select * from message
			where place = ${place} and card is not null and answer is not null
			order by at desc
			limit 10`.map(toMessage)
	}

	private countOpenCards(): Record<RoomKey, number> {
		const counts = noOpenCards()
		const rows = this.sql<{ place: PlaceType; count: number }>`
			select place, count(*) as count from message
			where place != 'room' and card is not null and answer is null
				and json_array_length(card, '$.actions') > 0
			group by place`
		for (const row of rows) {
			const room = roomOfPlace(row.place)
			if (room && roomKeys.includes(room)) counts[room] = row.count
		}
		return counts
	}

	private openCardsChanged() {
		this.setState({ ...this.state, openCards: this.countOpenCards() })
	}

	// True while a room's principal and associate have spoken fewer than ROOM_TURNS
	// times in a row in this timeline since the admin last wrote there.
	// Receipts are not turns.
	private roomTurnLeft(place: PlaceType) {
		const recent = this.sql<{
			author: string
		}>`
			select author from message
			where place = ${place} and receipt = 0
			order by at desc, id desc
			limit ${ROOM_TURNS}`
		return (
			recent.length < ROOM_TURNS || recent.some((row) => !isCrewKey(row.author))
		)
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
