import { z } from 'zod'

// The crew roster and the shapes the crew API sends. Imported by the Worker
// (worker/, .flue/) and by the app (src/), so it holds no runtime-specific code.

// Roster order, which is also the order the app lists the crew in.
export const crewKeys = [
	'riker',
	'data',
	'product',
	'library',
	'learnership',
] as const
export type CrewKey = (typeof crewKeys)[number]

// Each lead has a room of its own. An advisor sits in a lead's room as a
// second, more thorough voice, and has no room of its own.
export const leadKeys = ['riker', 'product', 'library', 'learnership'] as const
export type LeadKey = (typeof leadKeys)[number]

type CrewMemberBase = {
	// Also the @mention handle, since a name can hold spaces.
	key: CrewKey
	name: string
	// Before the name in the display name, as in "Cmdr Riker". Null for none.
	rank: string | null
	title: string
	// Shown under the title, and read by CLEF to decide who a message is for.
	looksAfter: Array<string>
	// null for an agent that does not run on a schedule.
	schedule: string | null
	// A planned agent has a room but no agent behind it yet, so messages for
	// it wait until it starts.
	active: boolean
	// The lines this member keeps in the Situation Report, one per track.
	// Empty for an advisor like Data, who serves every vertical.
	tracks: Array<string>
}

export type CrewMember =
	| (CrewMemberBase & { role: 'lead' })
	// `room` is the lead whose room the advisor sits in.
	| (CrewMemberBase & { role: 'advisor'; room: LeadKey })

export const crew: Record<CrewKey, CrewMember> = {
	riker: {
		key: 'riker',
		name: 'Riker',
		rank: 'Cmdr',
		title: 'First officer',
		role: 'lead',
		looksAfter: [
			"The admin's wishes, priorities and judgement, in the charter they keep together",
			'Where agents overlap or disagree',
			'What to bring to the admin, and what to decide or hold for them',
			'The weekly brief and the weekly meeting',
		],
		schedule: 'writes the weekly brief on Sunday at 04:00',
		active: true,
		tracks: ['Note'],
	},
	data: {
		key: 'data',
		name: 'Data',
		rank: null,
		title: 'Science officer',
		role: 'advisor',
		room: 'riker',
		looksAfter: [
			'Questions that need numbers, careful analysis or several thinking steps',
			'Charts and explorers built from the database',
			'Checking Riker’s instincts against the evidence',
		],
		schedule: null,
		active: true,
		tracks: [],
	},
	product: {
		key: 'product',
		name: 'Product',
		rank: 'Lt',
		title: 'Product manager',
		role: 'lead',
		looksAfter: [
			'The product plan for the next six weeks',
			'Retention, and how new people get started',
			"Turning the other agents' findings into work for you",
			"Pushing back on work that doesn't fit the plan",
		],
		schedule: 'runs daily at 07:00 UTC',
		active: true,
		tracks: ['Product', 'Engineering'],
	},
	library: {
		key: 'library',
		name: 'Library',
		rank: 'Lt Cmdr',
		title: 'Learning content',
		role: 'lead',
		looksAfter: [
			'The phrase library: duplicates, near-duplicates and gaps',
			'The phrase requests space, playlists and the template language',
			'How learners and phrases spread across languages',
			'When to hire a native-speaking translator',
			'Comments, requests and phrases people write',
			'Personal data that people post by mistake',
		],
		schedule: null,
		active: false,
		tracks: ['Library'],
	},
	learnership: {
		key: 'learnership',
		name: 'Learnership',
		rank: 'Prof',
		title: 'Growth and retention',
		role: 'lead',
		looksAfter: ['Signups, invites and where new people come from'],
		schedule: null,
		active: false,
		tracks: ['Growth', 'Retention'],
	},
}

export const crewList = crewKeys.map((key) => crew[key])

export const displayName = (agent: CrewKey) => {
	const { rank, name } = crew[agent]
	return rank ? `${rank} ${name}` : name
}

export const isLeadKey = (value: string): value is LeadKey =>
	(leadKeys as ReadonlyArray<string>).includes(value)

// The room an agent talks in besides the Common Room: its own, or, for an
// advisor, the room it advises.
export const roomOf = (agent: CrewKey): LeadKey => {
	const member = crew[agent]
	return member.role === 'advisor' ? member.room : (member.key as LeadKey)
}

// The lead first, then its advisors.
export const roomMembers = (lead: LeadKey): Array<CrewKey> =>
	crewKeys
		.filter((key) => roomOf(key) === lead)
		.toSorted((a, b) => (a === lead ? -1 : b === lead ? 1 : 0))

export const roomNames: Record<LeadKey, string> = {
	riker: 'Command room',
	product: 'Product room',
	library: 'Library room',
	learnership: 'Learnership room',
}

// Where a message lives: the Common Room, or one lead's room.
export const PlaceSchema = z.union([
	z.literal('room'),
	z.templateLiteral(['room:', z.enum(leadKeys)]),
])
export type PlaceType = z.infer<typeof PlaceSchema>

export const placeOf = (lead: LeadKey): PlaceType => `room:${lead}`
// The lead whose room a place is, or null for the Common Room.
export const leadOf = (place: PlaceType): LeadKey | null =>
	place === 'room' ? null : (place.slice('room:'.length) as LeadKey)

export const isCrewKey = (value: string): value is CrewKey =>
	(crewKeys as ReadonlyArray<string>).includes(value)

// A message's author: a crew key, or this for an admin.
export const adminAuthor = (uid: string) => `admin:${uid}`

// Every @name in the text that names a crew member, in roster order. The @
// must start a word, so the domain of an email address is not a mention.
export function mentionedCrew(text: string): Array<CrewKey> {
	const names = new Set(
		[...text.matchAll(/(?<![\w.])@([a-z]+)/gi)].map((match) =>
			match[1].toLowerCase()
		)
	)
	return crewKeys.filter((key) => names.has(key))
}

// A trailing "..." or "…" means "more is coming": CLEF never wakes anyone
// for it, and the next message that does wake someone carries it along.
export const endsWithEllipsis = (text: string) => /(\.\.\.|…)\s*$/.test(text)

export const RoutingSchema = z.object({
	kind: z.enum(['stack', 'room', 'route']),
	agents: z.array(z.enum(crewKeys)),
	// Who decided: a fixed rule ("..." or an @mention), the CLEF model, or
	// the admin, by changing the chip before sending.
	by: z.enum(['rule', 'model', 'you']),
})
export type RoutingType = z.infer<typeof RoutingSchema>

// CLEF's two fixed rules, checked before the model: a trailing "..." stacks,
// and an @mention routes. Null when neither applies.
export function fixedRouting(text: string): RoutingType | null {
	if (endsWithEllipsis(text)) return { kind: 'stack', agents: [], by: 'rule' }
	const mentioned = mentionedCrew(text)
	if (!mentioned.length) return null
	const active = mentioned.filter((key) => crew[key].active)
	// A planned agent cannot wake yet, so its messages wait in the room.
	return active.length
		? { kind: 'route', agents: active, by: 'rule' }
		: { kind: 'room', agents: [], by: 'rule' }
}

export const ActionSchema = z.object({ id: z.string(), label: z.string() })
export type ActionType = z.infer<typeof ActionSchema>

// Something an agent brings the admin, with the buttons they answer with.
// - question: a question in the Common Room; change: a proposed change to
//   the agent's plan
// - In any lead's room: decide (on hold until the admin answers), confirm
//   (acted in their stead; was that right?), know (nothing to answer) and
//   escalate (needs more than the crew has)
// - In the Command room only: charter (a proposed charter entry, `ref`),
//   brief (the weekly brief) and report (Data's pre-meeting report)
export const CardSchema = z.object({
	kind: z.enum([
		'question',
		'change',
		'decide',
		'confirm',
		'know',
		'escalate',
		'charter',
		'brief',
		'report',
	]),
	title: z.string().nullable(),
	// Empty for a card with nothing to answer.
	actions: z.array(ActionSchema),
	// The charter entry a "charter" card proposes.
	ref: z.number().nullable(),
})
export type CardType = z.infer<typeof CardSchema>

export const CrewMessageSchema = z.object({
	id: z.string(),
	at: z.string(),
	// A crew key for an agent, or "admin:<uid>".
	author: z.string(),
	authorName: z.string(),
	body: z.string(),
	// Set on admin messages only.
	routing: RoutingSchema.nullable(),
	card: CardSchema.nullable(),
	answer: z
		.object({
			actionId: z.string(),
			label: z.string(),
			by: z.string(),
			at: z.string(),
		})
		.nullable(),
	place: PlaceSchema,
	// Where the admin said, after sending, this message should have gone.
	corrected: RoutingSchema.nullable(),
	// The room's list of the edits an agent's run made, not the agent speaking.
	receipt: z.boolean(),
})
export type CrewMessageType = z.infer<typeof CrewMessageSchema>

// The agent who speaks a message: null for the admin's own messages and for
// the room's receipts.
export const speakerOf = (message: CrewMessageType): CrewKey | null =>
	isCrewKey(message.author) && !message.receipt ? message.author : null

export const AgentStatusSchema = z.object({
	state: z.enum(['idle', 'working']),
	since: z.string(),
})
export type AgentStatusType = z.infer<typeof AgentStatusSchema>

// The weekly cycle: Riker writes a brief early on Sunday, and the meeting
// with the admin is due until it happens.
export const WeeklySchema = z.object({
	briefAt: z.string().nullable(),
	meetingAt: z.string().nullable(),
	// The IANA time zone the brief's "Sunday 04:00" is in.
	timezone: z.string(),
})
export type WeeklyType = z.infer<typeof WeeklySchema>

export const meetingDue = (weekly: WeeklyType) =>
	!!weekly.briefAt && (!weekly.meetingAt || weekly.meetingAt < weekly.briefAt)

// The crew room's synced state: what every connected browser holds live.
export const RoomStateSchema = z.object({
	statuses: z.record(z.string(), AgentStatusSchema),
	weekly: WeeklySchema,
	// Cards in each lead's room waiting on the admin, for the sidebar.
	openCards: z.record(z.enum(leadKeys), z.number()),
})
export type RoomStateType = z.infer<typeof RoomStateSchema>

export const RoomSnapshotSchema = RoomStateSchema.extend({
	messages: z.array(CrewMessageSchema),
	// When this admin last opened the room, before this visit. The app draws
	// the "New since" line here.
	seenAt: z.string().nullable(),
})
export type RoomSnapshotType = z.infer<typeof RoomSnapshotSchema>

export const TodoSchema = z.object({
	id: z.number(),
	text: z.string(),
	note: z.string().nullable(),
	done: z.boolean(),
	at: z.string(),
	doneAt: z.string().nullable(),
})
export type TodoType = z.infer<typeof TodoSchema>

export const MemorySchema = z.object({
	id: z.number(),
	// "metric" and "chart" are Data's playbook: the metrics the admin likes in
	// each domain, and how they like charts drawn.
	kind: z.enum(['fact', 'metric', 'chart']),
	domain: z.string().nullable(),
	text: z.string(),
	at: z.string(),
})
export type MemoryType = z.infer<typeof MemorySchema>

// What the whole crew knows about the admin, such as their name and how to
// refer to them. Only the admin writes it; every agent reads it every run.
export const CommonKnowledgeSchema = z.object({
	id: z.number(),
	text: z.string(),
	at: z.string(),
})
export type CommonKnowledgeType = z.infer<typeof CommonKnowledgeSchema>

// The longest text the voice model reads in one request.
export const MAX_SPEECH_CHARS = 2000

// Riker's line is a note of a few paragraphs; every other line is one line.
export const SITREP_LINE_MAX = 240
export const SITREP_NOTE_MAX = 1500
export const sitrepMax = (agent: CrewKey) =>
	agent === 'riker' ? SITREP_NOTE_MAX : SITREP_LINE_MAX

// The Situation Report: where each vertical stands right now, in a line per
// track, and Riker's note on the whole. Small enough for every agent to read
// at the top of every run.
export const SitrepLineSchema = z.object({
	agent: z.enum(crewKeys),
	track: z.string(),
	text: z.string(),
	// A crew key, or "admin:<uid>".
	by: z.string(),
	byName: z.string(),
	at: z.string(),
})
export type SitrepLineType = z.infer<typeof SitrepLineSchema>

export const OpenItemSchema = z.object({
	id: z.number(),
	title: z.string(),
	tag: z.string().nullable(),
	at: z.string(),
})
export type OpenItemType = z.infer<typeof OpenItemSchema>

// What the Command room knows about the admin: principles (philosophy,
// strategy, taste) and lessons (how they decide). An entry counts only once
// the admin keeps it; until then it is a card in the Command room.
export const CharterEntrySchema = z.object({
	id: z.number(),
	kind: z.enum(['principle', 'lesson']),
	text: z.string(),
	why: z.string().nullable(),
	status: z.enum(['proposed', 'kept', 'dropped']),
	at: z.string(),
	keptAt: z.string().nullable(),
})
export type CharterEntryType = z.infer<typeof CharterEntrySchema>

// One lead's room: its latest messages, and when this admin last opened it.
export const RoomThreadSchema = z.object({
	messages: z.array(CrewMessageSchema),
	seenAt: z.string().nullable(),
})
export type RoomThreadType = z.infer<typeof RoomThreadSchema>

// What only the Command room has: the charter, and the weekly meeting.
export const CommandSchema = z.object({
	charter: z.array(CharterEntrySchema),
	// Set while this week's meeting is under way.
	meetingStartedAt: z.string().nullable(),
})
export type CommandType = z.infer<typeof CommandSchema>

export const WorkspaceSchema = z.object({
	agent: z.enum(crewKeys),
	todos: z.array(TodoSchema),
	memory: z.array(MemorySchema),
	openItems: z.array(OpenItemSchema),
	// This agent's cards from the Common Room and its own room, newest first.
	cards: z.array(CrewMessageSchema),
})
export type WorkspaceType = z.infer<typeof WorkspaceSchema>

// What the room pushes over its WebSocket.
export type RoomEvent =
	| { type: 'message'; message: CrewMessageType }
	| { type: 'workspace'; agent: CrewKey }
	// The charter or the weekly meeting changed.
	| { type: 'command' }
	| { type: 'common-knowledge' }
	| { type: 'sitrep' }
