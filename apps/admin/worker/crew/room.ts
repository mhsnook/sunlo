import { Agent } from 'agents'
import {
	adminAuthor,
	COMMON_ROOM,
	crew,
	crewKeys,
	displayName,
	draftTitle,
	fixedRouting,
	githubAccess,
	handleOf,
	routeTo,
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
	SITREP,
	type ActionType,
	type AgentStatusType,
	type CardType,
	type CharterEntryType,
	type CommandType,
	type CommonKnowledgeType,
	type CrewKey,
	type CrewMessageType,
	type DocumentSummaryType,
	type DocumentType,
	type GithubDraftType,
	type RevisionTextType,
	type RevisionType,
	type RoomKey,
	type MemoryType,
	type OpenItemType,
	type PlaceType,
	type RoomEvent,
	type RoomSnapshotType,
	type RoomStateType,
	type RoomThreadType,
	type RoutingType,
	type WeeklyType,
	type WorkspaceType,
} from '../../shared/crew'
import { briefingText, timelineText, type UnreadTimeline } from './briefing'
import { clefPrompt, parseClefReply, type ClefExample } from './clef'
import { checkSave, startingDocuments, type SaveCheck } from './documents'
import {
	draftText,
	filingReport,
	findPersonalData,
	githubConfigured,
	githubFor,
	personalDataRefusal,
} from './github'
import { peopleIndex } from './queries'
import { withSql } from '../db'

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

// The Situation Report's one row, from before it was a document.
type SitrepRow = {
	text: string
	by: string
	by_name: string
	at: string
}

type DocumentRow = {
	id: number
	room: RoomKey
	name: string
	revision: number
	by_name: string | null
	at: string | null
}

type RevisionRow = {
	revision: number
	summary: string
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
const FILE = { id: 'file', label: 'File it' }

type IdRow = { id: number }
type CountRow = { count: number }

type Playbook = { kind: 'metric' | 'chart' | 'style'; domain: string | null }

// An agent's mention of an agent from another room wakes it, at most this
// many times an hour, so two agents cannot keep waking each other.
const AGENT_WAKES_PER_HOUR = 6
// A room's principal and associate may talk back and forth this many turns
// in a row before the admin says something; a discussion longer than that
// waits.
const ROOM_TURNS = 8
const SNAPSHOT_MESSAGES = 200
const CLEF_EXAMPLES_SHOWN = 20

const now = () => new Date().toISOString()
// Done to-dos stay in view this long.
const twoWeeksAgo = () => new Date(Date.now() - 14 * 86_400_000).toISOString()

// Every key an agent had before it was keyed by its seat, and the seat it
// holds now. Stored rows still carry these until the migrations rename them.
const OLD_AGENT_KEYS: Record<string, CrewKey> = {
	riker: 'command-1',
	data: 'command-2',
	product: 'product-1',
	geordi: 'product-1',
	library: 'library-1',
	hoshi: 'library-1',
	growth: 'learnership-1',
	guinan: 'learnership-1',
}

const noOpenCards = () =>
	Object.fromEntries(roomKeys.map((room) => [room, 0])) as Record<
		RoomKey,
		number
	>

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

const toDocumentSummary = (row: DocumentRow): DocumentSummaryType => ({
	id: row.id,
	room: row.room,
	name: row.name,
	revision: row.revision,
	byName: row.by_name,
	at: row.at,
})

const toRevision = (row: RevisionRow): RevisionType => ({
	revision: row.revision,
	summary: row.summary,
	by: row.by,
	byName: row.by_name,
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
			-- A room's named document. Its revision is the current one: 0 until
			-- someone writes it.
			create table if not exists document (
				id integer primary key autoincrement,
				room text not null,
				name text not null collate nocase,
				revision integer not null default 0,
				unique (room, name)
			);
			create table if not exists document_revision (
				document integer not null,
				revision integer not null,
				text text not null,
				summary text not null,
				by text not null,
				by_name text not null,
				at text not null,
				primary key (document, revision)
			);
			-- command-2's pre-meeting report for each week's brief.
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
			create index if not exists message_place on message (place, at);
			create table if not exists schema_version (version integer not null);
		`
		const version =
			this.sql<{ version: number }>`select version from schema_version`[0]
				?.version ?? 0
		// Append only: a migration's position is the schema version it brings
		// the room to, and the room runs each one once.
		const migrations = [
			() => this.migrateToRooms(),
			() => this.moveSitrepIntoDocuments(),
			() => this.renameAgentsToSeats(),
		]
		if (version < migrations.length) {
			for (const migrate of migrations.slice(version)) migrate()
			this.sql`delete from schema_version`
			this
				.sql`insert into schema_version (version) values (${migrations.length})`
		}
	}

	// State saved before the open-card counts existed lacks them, and state
	// saved before the seat keys holds statuses under the old keys.
	onStart() {
		const saved: Partial<RoomStateType> = this.state
		const stale = Object.keys(this.state.statuses).some(
			(key) => !isCrewKey(key)
		)
		if (!saved.openCards || stale) {
			this.setState({
				statuses: Object.fromEntries(
					Object.entries(this.state.statuses).filter(([key]) => isCrewKey(key))
				),
				weekly: this.state.weekly,
				openCards: this.countOpenCards(),
			})
		}
		return Promise.resolve()
	}

	// The room before there were subject rooms: the Enterprise thread
	// ("bridge"), cards from 1:1 chats ("dm"), agents under their old keys,
	// and Monitor and Moderator, who are gone. Each step finds nothing to
	// change once it has run, so a second run does no harm.
	private migrateToRooms() {
		this.sql`
			create table if not exists situation_report (
				id integer primary key check (id = 1),
				text text not null,
				by text not null,
				by_name text not null,
				at text not null
			)`
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
		this.mergeSitrepIntoOneReport()
		this.renameAgentsToSeats()
		for (const [from, to] of Object.entries(OLD_AGENT_KEYS)) {
			this.sql`
				update situation_report set by = ${to}, by_name = ${displayName(to)}
				where by = ${from}`
		}
		this.renamePlace('bridge', 'room:command')
		const dmAuthors = this.sql<{ author: string }>`
			select distinct author from message where place = 'dm'`
		for (const { author } of dmAuthors) {
			const place = isCrewKey(author) ? placeOf(roomOf(author)) : COMMON_ROOM
			this.sql`
				update message set place = ${place}
				where place = 'dm' and author = ${author}`
		}
	}

	// The Situation Report kept a line per agent and track; now it is one
	// document. The first officer's note opens it, then each room's lines
	// follow under the room's name. Monitor's and Moderator's lines have no
	// room and go. Runs before the agents are renamed, which fixes the credit
	// after.
	private mergeSitrepIntoOneReport() {
		const old = this.sql<{ name: string }>`
			select name from sqlite_master where type = 'table' and name = 'sitrep'`
		if (!old.length) return
		const rows = this.sql<SitrepTrackRow>`select * from sitrep order by at`
		const roomOfOldAgent = (agent: string) => {
			const key = OLD_AGENT_KEYS[agent]
			return key ? roomOf(key) : null
		}
		const firstOfficer = (agent: string) =>
			OLD_AGENT_KEYS[agent] === 'command-1'
		const note = rows.find((row) => firstOfficer(row.agent))?.text
		const sections = roomKeys.flatMap((room) => {
			const lines = rows.filter(
				(row) => !firstOfficer(row.agent) && roomOfOldAgent(row.agent) === room
			)
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
			this.sql`
				insert into situation_report (id, text, by, by_name, at)
				values (1, ${text}, ${latest.by}, ${latest.by_name}, ${latest.at})`
		}
		this.sql`drop table sitrep`
	}

	private renameAgentsToSeats() {
		for (const [from, to] of Object.entries(OLD_AGENT_KEYS)) {
			this.renameAgent(from, to)
		}
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
		this.sql`
			update document_revision set by = ${to}, by_name = ${name}
			where by = ${from}`
	}

	// The rooms' starting documents, and the Situation Report's one row as
	// the first revision of its document.
	private moveSitrepIntoDocuments() {
		for (const { room, name } of startingDocuments) {
			this
				.sql`insert or ignore into document (room, name) values (${room}, ${name})`
		}
		const row = this.sql<SitrepRow>`select * from situation_report`[0]
		const sitrep = this.findDocument('command', SITREP)
		if (row && sitrep?.revision === 0) {
			this.sql`
				insert into document_revision (document, revision, text, summary, by, by_name, at)
				values (${sitrep.id}, 1, ${row.text}, '', ${row.by}, ${row.by_name}, ${row.at})`
			this.sql`update document set revision = 1 where id = ${sitrep.id}`
		}
		this.sql`drop table situation_report`
	}

	private renamePlace(from: string, to: PlaceType) {
		this.sql`update message set place = ${to} where place = ${from}`
		this.sql`update or replace cursor set place = ${to} where place = ${from}`
		this.sql`update or replace seen set place = ${to} where place = ${from}`
	}

	// ---- The timelines ------------------------------------------------------

	// The Common Room, with the room's synced state.
	snapshot(uid: string): RoomSnapshotType {
		return {
			...this.state,
			messages: this.latestRows(COMMON_ROOM, SNAPSHOT_MESSAGES).map(toMessage),
			seenAt: this.seenAt(uid, COMMON_ROOM),
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
			routing.kind === 'route' ? this.stackedBodies(author, COMMON_ROOM) : []
		const message = this.insert({
			author,
			authorName: input.name,
			body: input.body,
			routing,
			card: null,
			place: COMMON_ROOM,
		})
		this.sql`insert into clef_decision (message_id, text, predicted, final, at)
			values (${message.id}, ${input.body}, ${labelOf(predicted)}, ${labelOf(routing)}, ${message.at})`
		const body = [...stacked, input.body].join('\n')
		const wake = routing.agents.map(
			(agent): Wake => ({
				agent,
				body,
				messageId: message.id,
				place: COMMON_ROOM,
			})
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
		const routing =
			fixedRouting(input.body, roomMembers(input.room)) ??
			routeTo([principalOf(input.room)], 'rule')
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
				and place = ${COMMON_ROOM}`[0]
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
					place: COMMON_ROOM,
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
		const placeRoom = roomOfPlace(input.place)
		if (input.card) {
			this.push({ type: 'workspace', agent: input.agent })
			if (placeRoom) this.openCardsChanged()
		}
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
		// Filing goes through recordFiling, after GitHub has the draft.
		if (message.card.kind === 'github' && !dismissed) {
			return {
				ok: false,
				status: 409,
				error: 'File a GitHub draft from its card',
			}
		}
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
		if (roomOfPlace(message.place)) this.openCardsChanged()
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
			documents: this.documents(room),
			github: githubAccess[agent]
				? { access: githubAccess[agent], connected: githubConfigured(this.env) }
				: null,
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
			unread: {
				common: this.unread(agent, COMMON_ROOM),
				own: this.unread(agent, place),
			},
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
			timelineText(this.latestRows(COMMON_ROOM, limit).map(toMessage)) ||
			'(empty)'
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
		draft?: GithubDraftType
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
				...(input.draft ? { draft: input.draft } : {}),
			},
			place: placeOf(roomOf(input.author)),
		})
		this.push({ type: 'workspace', agent: input.author })
		this.openCardsChanged()
		return message.id
	}

	// A draft for GitHub: a card in the agent's room that the admin can edit,
	// then file. Nothing reaches GitHub until they do.
	draftForGithub(input: {
		author: CrewKey
		draft: GithubDraftType
		why: string
	}) {
		const { draft } = input
		return this.bringToAdmin({
			author: input.author,
			kind: 'github',
			title: draftTitle(draft),
			body: input.why,
			actions: [FILE],
			draft,
		})
	}

	// The admin files a "github" card's draft, as they edited it: checked for
	// personal data, published on GitHub, then recorded as the card's answer,
	// which links to what GitHub made. The card keeps the agent's draft, and
	// the agent hears both versions when they differ.
	async fileDraft(input: {
		messageId: string
		draft: GithubDraftType
		name: string
	}): Promise<
		| { ok: true; url: string; agent: CrewKey; report: string }
		| { ok: false; status: 400 | 404 | 409 | 503; error: string }
	> {
		const message = this.messageById(input.messageId)
		const drafted = message?.card?.draft
		if (!message || !drafted || !isCrewKey(message.author)) {
			return { ok: false, status: 404, error: 'No GitHub draft with that id' }
		}
		if (message.answer) {
			return {
				ok: false,
				status: 409,
				error: `${message.answer.by} already answered "${message.answer.label}"`,
			}
		}
		if (input.draft.type !== drafted.type) {
			return {
				ok: false,
				status: 400,
				error: `This card files a ${drafted.type}`,
			}
		}
		const people = await withSql(this.env.HYPERDRIVE, 10_000, peopleIndex)
		const found = findPersonalData(draftText(input.draft), people)
		if (found) {
			return {
				ok: false,
				status: 400,
				error: personalDataRefusal('Not filed', found),
			}
		}
		const github = githubFor(this.env)
		if (!github) {
			return {
				ok: false,
				status: 503,
				error: 'GitHub is not connected: the GitHub App is not set up',
			}
		}
		const result = await github.file(input.draft)
		const answer = {
			actionId: FILE.id,
			label:
				input.draft.type === 'comment'
					? `Commented on #${input.draft.issue}`
					: input.draft.type === 'milestone'
						? 'Created the milestone'
						: `Filed #${result.number}`,
			by: input.name,
			at: now(),
			url: result.url,
		}
		this.sql`
			update message set answer = ${JSON.stringify(answer)}
			where id = ${message.id}`
		this.push({ type: 'message', message: { ...message, answer } })
		this.push({ type: 'workspace', agent: message.author })
		this.openCardsChanged()
		return {
			ok: true,
			url: result.url,
			agent: message.author,
			report: filingReport({
				drafted,
				filed: input.draft,
				result,
				by: input.name,
			}),
		}
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

	// The admin starting the weekly meeting: command-1 takes it from here, and
	// the meeting counts as started until it closes it.
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

	// command-1 calls this too, when the admin asks for the meeting somewhere
	// other than the start button. `needsReport` is true only for the call
	// that starts the meeting, and only when command-2 has not filed a report for
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

	// command-2's pre-meeting report: a folded card in the Command room, and the
	// one report for this week's meeting.
	fileReport(input: { title: string; body: string }) {
		const messageId = this.bringToAdmin({
			author: 'command-2',
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
				(directive) => `@${handleOf(directive.to)} ${directive.text}`
			),
		]
		return posts.flatMap(
			(body) =>
				this.postFromAgent({
					agent: 'command-1',
					body,
					card: null,
					place: COMMON_ROOM,
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

	// ---- Room documents -----------------------------------------------------

	documents(room: RoomKey): Array<DocumentSummaryType> {
		return this.sql<IdRow>`
			select id from document where room = ${room} order by id`.flatMap(
			(row) => this.documentSummary(row.id) ?? []
		)
	}

	document(id: number): DocumentType | null {
		const summary = this.documentSummary(id)
		if (!summary) return null
		const revisions = this.sql<RevisionRow>`
			select revision, summary, by, by_name, at from document_revision
			where document = ${id}
			order by revision desc
			limit 50`.map(toRevision)
		return {
			...summary,
			text: this.revision(id, summary.revision)?.text ?? '',
			revisions,
		}
	}

	revision(id: number, revision: number): RevisionTextType | null {
		const row = this.sql<RevisionRow & { text: string }>`
			select revision, summary, by, by_name, at, text from document_revision
			where document = ${id} and revision = ${revision}`[0]
		return row ? { ...toRevision(row), text: row.text } : null
	}

	// Read in full by every agent at the top of every run.
	sitrep(): DocumentType | null {
		const sitrep = this.findDocument('command', SITREP)
		return sitrep && this.document(sitrep.id)
	}

	// Any room's document, by name, for an agent. The refusal names the
	// documents the room does keep.
	readDocument(
		room: RoomKey,
		name: string
	): { ok: true; document: DocumentType } | { ok: false; error: string } {
		const found = this.findDocument(room, name)
		const document = found && this.document(found.id)
		if (document) return { ok: true, document }
		const names = this.documents(room).map((doc) => `"${doc.name}"`)
		return {
			ok: false,
			error: `The ${roomNames[room]} has no document named "${name}". ${names.length ? `It keeps ${names.join(', ')}.` : 'It keeps none yet.'}`,
		}
	}

	// An agent saving one of its own room's documents. A name no room uses
	// starts a new document; a name another room uses is refused, so a room
	// never ends up with its own copy of another room's document.
	writeDocument(input: {
		agent: CrewKey
		name: string
		text: string
		baseRevision: number
		summary: string
	}): SaveCheck {
		const room = roomOf(input.agent)
		const existing = this.findDocument(room, input.name)
		const name = existing?.name ?? input.name.trim()
		if (!existing) {
			const elsewhere = roomKeys.find(
				(other) => other !== room && this.findDocument(other, name)
			)
			if (elsewhere) {
				return {
					ok: false,
					status: 409,
					error: `Nothing was saved: "${name}" belongs to the ${roomNames[elsewhere]}, and only its officers write it. Ask @${elsewhere} in the Common Room.`,
				}
			}
		}
		const saved = this.saveRevision({
			room,
			name,
			document: existing,
			text: input.text,
			baseRevision: input.baseRevision,
			summary: input.summary,
			by: input.agent,
			byName: displayName(input.agent),
		})
		if (saved.ok) {
			this.workspaceEdited(
				input.agent,
				`saved ${name} revision ${saved.revision}: ${input.summary}`
			)
		}
		return saved
	}

	// The admin saving a document from the room log, or restoring an older
	// revision, which saves its text as a new one.
	editDocument(input: {
		id: number
		text: string
		baseRevision: number
		summary: string
		by: string
		byName: string
	}): SaveCheck {
		const document = this.documentSummary(input.id)
		if (!document) {
			return { ok: false, status: 404, error: 'No document with that id' }
		}
		return this.saveRevision({
			...input,
			room: document.room,
			name: document.name,
			document,
		})
	}

	private findDocument(room: RoomKey, name: string) {
		const row = this.sql<{ id: number }>`
			select id from document where room = ${room} and name = ${name.trim()}`[0]
		return row ? this.documentSummary(row.id) : null
	}

	private documentSummary(id: number): DocumentSummaryType | null {
		const row = this.sql<DocumentRow>`
			select document.id, document.room, document.name, document.revision,
				document_revision.by_name, document_revision.at
			from document
			left join document_revision on document_revision.document = document.id
				and document_revision.revision = document.revision
			where document.id = ${id}`[0]
		return row ? toDocumentSummary(row) : null
	}

	private saveRevision(input: {
		room: RoomKey
		name: string
		// Null to start a new document.
		document: DocumentSummaryType | null
		text: string
		baseRevision: number
		summary: string
		by: string
		byName: string
	}): SaveCheck {
		const text = input.text.trim()
		const check = checkSave({
			name: input.name,
			current: input.document?.revision ?? null,
			base: input.baseRevision,
			text,
		})
		if (!check.ok) return check
		const id =
			input.document?.id ??
			this.sql<IdRow>`
				insert into document (room, name) values (${input.room}, ${input.name})
				returning id`[0].id
		this.sql`
			insert into document_revision (document, revision, text, summary, by, by_name, at)
			values (${id}, ${check.revision}, ${text}, ${input.summary.trim()}, ${input.by}, ${input.byName}, ${now()})`
		this.sql`update document set revision = ${check.revision} where id = ${id}`
		this.push({ type: 'document', room: input.room, id })
		return check
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
	private unread(agent: CrewKey, place: PlaceType): UnreadTimeline {
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
		return { since: !!cursor, messages: rows.map(toMessage) }
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

	// What the agent has written for GitHub in its current run: cards it
	// drafted, and direct edits. The tools' loop guards read this, since a
	// tool's own state does not outlive one model call.
	githubWritesThisRun(agent: CrewKey) {
		const since = this.state.statuses[agent]?.since ?? now()
		const { drafts } = this.sql<{ drafts: number }>`
			select count(*) as drafts from message
			where author = ${agent} and at >= ${since}
				and json_extract(card, '$.kind') = 'github'`[0]
		const { edits } = this.sql<{ edits: number }>`
			select count(*) as edits from edit_log
			where agent = ${agent} and at >= ${since} and what like 'edited %'`[0]
		return { drafts, edits }
	}

	// An agent's own edit, in the workspace or on GitHub: it goes in the
	// receipt that ends its run.
	workspaceEdited(agent: CrewKey, what: string) {
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

	private messageById(id: string): CrewMessageType | null {
		const row = this.sql<MessageRow>`select * from message where id = ${id}`[0]
		return row ? toMessage(row) : null
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

	private countOpenCards() {
		return Object.fromEntries(
			roomKeys.map((room) => [room, this.openCards(placeOf(room)).length])
		) as Record<RoomKey, number>
	}

	private openCardsChanged() {
		this.setState({ ...this.state, openCards: this.countOpenCards() })
	}

	// True while a room's principal and associate have spoken fewer than
	// ROOM_TURNS times in a row in this timeline since the admin last wrote
	// there.
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
	return routing.kind === 'route'
		? routeTo(routing.agents, routing.by)
		: { ...routing, agents: [] }
}

// The part of a routing that CLEF decides, with agents in a fixed order, so
// two labels compare equal as strings.
function labelOf(routing: RoutingType) {
	return JSON.stringify({
		kind: routing.kind,
		agents: routing.agents.toSorted(),
	})
}
