import { z } from 'zod'

// The crew roster and the shapes the crew API sends. Imported by the Worker
// (worker/, .flue/) and by the app (src/), so it holds no runtime-specific code.

// Each room is a subject. Its principal answers it first, and may call on
// an associate, a second, more thorough voice that works in the same room.
export const roomKeys = [
	'command',
	'product',
	'library',
	'learnership',
] as const
export type RoomKey = (typeof roomKeys)[number]

export const roomNames: Record<RoomKey, string> = {
	command: 'Command room',
	product: 'Product room',
	library: 'Library room',
	learnership: 'Learnership room',
}

// Each agent's key is its seat: its room, then 1 for the principal and 2 on
// for associates. Roster order, which is also the order the app lists the
// crew in.
export const crewKeys = [
	'command-1',
	'command-2',
	'product-1',
	'product-2',
	'library-1',
	'learnership-1',
] as const
export type CrewKey = (typeof crewKeys)[number]

export type CrewMember = {
	key: CrewKey
	// What the app and the other agents call it. The code never does.
	name: string
	// Before the name in the display name, as in "Cmdr". Null for none.
	rank: string | null
	title: string
	room: RoomKey
	role: 'principal' | 'associate'
	// Shown under the title, and read by CLEF to decide who a message is for.
	looksAfter: Array<string>
	// null for an agent that does not run on a schedule.
	schedule: string | null
	// A planned agent has a place in its room but no agent behind it yet, so
	// messages for it wait until it starts.
	active: boolean
}

export const crew: Record<CrewKey, CrewMember> = {
	'command-1': {
		key: 'command-1',
		name: 'Riker',
		rank: 'Cmdr',
		title: 'First officer',
		room: 'command',
		role: 'principal',
		looksAfter: [
			"The admin's wishes, priorities and judgement, in the charter they keep together",
			'Where agents overlap or disagree',
			'What to bring to the admin, and what to decide or hold for them',
			'The weekly brief and the weekly meeting',
		],
		schedule: 'writes the weekly brief on Sunday at 04:00',
		active: true,
	},
	'command-2': {
		key: 'command-2',
		name: 'Data',
		rank: null,
		title: 'Science officer',
		room: 'command',
		role: 'associate',
		looksAfter: [
			'Questions that need numbers, careful analysis or several thinking steps',
			'Charts and explorers built from the database',
			'Checking the first officer’s instincts against the evidence',
		],
		schedule: null,
		active: true,
	},
	'product-1': {
		key: 'product-1',
		name: "O'Brien",
		rank: null,
		title: 'Product manager',
		room: 'product',
		role: 'principal',
		looksAfter: [
			'The product plan for the next six weeks',
			'Retention, and how new people get started',
			"Turning the other agents' findings into work for you",
			"Pushing back on work that doesn't fit the plan",
		],
		schedule: 'runs daily at 07:00 UTC',
		active: true,
	},
	'product-2': {
		key: 'product-2',
		name: 'Keiko',
		rank: null,
		title: 'Design',
		room: 'product',
		role: 'associate',
		looksAfter: [
			'How Sunlo looks and feels, and how much it asks of people at once',
			'A second, slower view on the plan, with an eye for the details',
			'A design review before user-facing work is filed for building',
		],
		schedule: null,
		active: true,
	},
	'library-1': {
		key: 'library-1',
		name: 'Hoshi',
		rank: null,
		title: 'Learning content',
		room: 'library',
		role: 'principal',
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
	},
	'learnership-1': {
		key: 'learnership-1',
		name: 'Guinan',
		rank: null,
		title: 'Growth and retention',
		room: 'learnership',
		role: 'principal',
		looksAfter: ['Signups, invites and where new people come from'],
		schedule: null,
		active: false,
	},
}

export const crewList = crewKeys.map((key) => crew[key])

export const displayName = (agent: CrewKey) => {
	const { rank, name } = crew[agent]
	return rank ? `${rank} ${name}` : name
}

export const isRoomKey = (value: string): value is RoomKey =>
	(roomKeys as ReadonlyArray<string>).includes(value)

export const roomOf = (agent: CrewKey): RoomKey => crew[agent].room

export const principalOf = (room: RoomKey): CrewKey =>
	crewKeys.find(
		(key) => crew[key].room === room && crew[key].role === 'principal'
	)!

export const associatesOf = (room: RoomKey): Array<CrewKey> =>
	crewKeys.filter(
		(key) => crew[key].room === room && crew[key].role === 'associate'
	)

// The principal first, then its associates.
export const roomMembers = (room: RoomKey): Array<CrewKey> => [
	principalOf(room),
	...associatesOf(room),
]

// Everyone else who works in the agent's room.
export const roommatesOf = (agent: CrewKey): Array<CrewKey> =>
	roomMembers(roomOf(agent)).filter((key) => key !== agent)

// The Common Room's place. Not to be confused with the routing kind "room",
// which means a message was left in the Common Room without waking anyone.
export const COMMON_ROOM = 'room'

// Where a message lives: the Common Room, or one subject's room.
export const PlaceSchema = z.union([
	z.literal(COMMON_ROOM),
	z.templateLiteral(['room:', z.enum(roomKeys)]),
])
export type PlaceType = z.infer<typeof PlaceSchema>

export const placeOf = (room: RoomKey): PlaceType => `room:${room}`
// The room a place is, or null for the Common Room.
export const roomOfPlace = (place: string): RoomKey | null => {
	const room = place.slice('room:'.length)
	return place.startsWith('room:') && isRoomKey(room) ? room : null
}

export const isCrewKey = (value: string): value is CrewKey =>
	(crewKeys as ReadonlyArray<string>).includes(value)

// A message's author: a crew key, or this for an admin.
export const adminAuthor = (uid: string) => `admin:${uid}`

// The handle people and agents write for a crew member: its name, lower-cased,
// with only letters, digits and hyphens kept.
export const handleOf = (agent: CrewKey) =>
	crew[agent].name.toLowerCase().replace(/[^a-z0-9-]/g, '')

const APOSTROPHE = /['’]/

// A crew member answers to its handle and to its key, and a room's name is a
// handle for its principal, so "product" reaches whoever runs the Product
// room. A name with an apostrophe in it and a possessive both resolve, so
// "o'brien" and "keiko's" each reach someone.
export function resolveHandle(handle: string): CrewKey | null {
	const name = handle.toLowerCase()
	if (isRoomKey(name)) return principalOf(name)
	if (isCrewKey(name)) return name
	const joined = name.replace(new RegExp(APOSTROPHE, 'g'), '')
	const named = crewKeys.find((key) => handleOf(key) === joined)
	if (named) return named
	return APOSTROPHE.test(name) ? resolveHandle(name.split(APOSTROPHE)[0]) : null
}

// Every crew member the text @mentions, in roster order. The @ must start a
// word, so the domain of an email address is not a mention.
export function mentionedCrew(text: string): Array<CrewKey> {
	const named = new Set(
		[...text.matchAll(/(?<![\w.])@([a-z][a-z0-9-]*(?:['’][a-z0-9-]+)?)/gi)].map(
			(match) => resolveHandle(match[1])
		)
	)
	return crewKeys.filter((key) => named.has(key))
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

// Sends a message to the agents that have started. A planned agent cannot
// wake yet, so a message only for it waits in the room.
export function routeTo(
	agents: Array<CrewKey>,
	by: RoutingType['by']
): RoutingType {
	const active = agents.filter((key) => crew[key].active)
	return active.length
		? { kind: 'route', agents: active, by }
		: { kind: 'room', agents: [], by }
}

// The two fixed rules, checked before CLEF's model: a trailing "..." stacks,
// and an @mention of someone in `among` routes. Null when neither applies.
export function fixedRouting(
	text: string,
	among: ReadonlyArray<CrewKey> = crewKeys
): RoutingType | null {
	if (endsWithEllipsis(text)) return { kind: 'stack', agents: [], by: 'rule' }
	const mentioned = mentionedCrew(text).filter((key) => among.includes(key))
	return mentioned.length ? routeTo(mentioned, 'rule') : null
}

export const ActionSchema = z.object({ id: z.string(), label: z.string() })

// Which crew members have GitHub tools: "write" files through cards and
// edits directly, "read" only reads. Neither has any tools until the GitHub
// App's secrets are set.
export const githubAccess: Partial<Record<CrewKey, 'read' | 'write'>> = {
	'command-1': 'read',
	'product-1': 'write',
}

// Something an agent drafted for GitHub, which the admin can edit on its
// card before filing it. An epic is an issue with the "epic" label.
// The longest texts a GitHub draft or edit may hold, for the agents' tools
// and for the drafts the admin files.
export const GITHUB_LIMITS = {
	title: 200,
	body: 60_000,
	description: 20_000,
	label: 50,
	labels: 10,
} as const

const Title = z.string().trim().min(1).max(GITHUB_LIMITS.title)
const Body = z.string().trim().min(1).max(GITHUB_LIMITS.body)

export const GithubDraftSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('issue'),
		title: Title,
		body: Body,
		labels: z
			.array(z.string().trim().min(1).max(GITHUB_LIMITS.label))
			.max(GITHUB_LIMITS.labels),
		milestone: z.number().int().nullable(),
		// For the card; the number is what GitHub gets.
		milestoneTitle: z.string().nullable(),
	}),
	z.object({
		type: z.literal('milestone'),
		title: Title,
		description: z.string().trim().max(GITHUB_LIMITS.description),
		// YYYY-MM-DD, or null for none.
		dueOn: z.iso.date().nullable(),
	}),
	z.object({
		type: z.literal('comment'),
		issue: z.number().int(),
		body: Body,
	}),
])
export type GithubDraftType = z.infer<typeof GithubDraftSchema>

// A draft's title on its card; a comment has none of its own.
export const draftTitle = (draft: GithubDraftType) =>
	draft.type === 'comment' ? `Comment on #${draft.issue}` : draft.title

export const draftBody = (draft: GithubDraftType) =>
	draft.type === 'milestone' ? draft.description : draft.body
export type ActionType = z.infer<typeof ActionSchema>

// Something an agent brings the admin, with the buttons they answer with.
// - question: a question in the Common Room; change: a proposed change to
//   the agent's plan
// - In any subject's room: decide (on hold until the admin answers), confirm
//   (acted in their stead; was that right?), know (nothing to answer) and
//   escalate (needs more than the crew has), and charter (a proposed entry
//   for the room's charter, `ref`)
// - In the Command room only: brief (the weekly brief) and report
//   (command-2's pre-meeting report)
// - github: a draft for GitHub (`draft`), which "File it" publishes
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
		'github',
	]),
	title: z.string().nullable(),
	// Empty for a card with nothing to answer.
	actions: z.array(ActionSchema),
	// The charter entry a "charter" card proposes.
	ref: z.number().nullable(),
	draft: GithubDraftSchema.optional(),
})
export type CardType = z.infer<typeof CardSchema>

// Which of two views the admin went with: the principal's message, or the
// associate's other view of it.
export const PickChoiceSchema = z.enum(['original', 'other'])
export type PickChoice = z.infer<typeof PickChoiceSchema>

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
			// What a filed "github" card became.
			url: z.string().optional(),
		})
		.nullable(),
	place: PlaceSchema,
	// Where the admin said, after sending, this message should have gone.
	corrected: RoutingSchema.nullable(),
	// The room's list of the edits an agent's run made, not the agent speaking.
	receipt: z.boolean(),
	// An associate's answer that differs from the principal's, which the app
	// shows beside it: the id of the principal's message.
	otherViewOf: z.string().nullable(),
	// On an other view: which of the two views the admin went with.
	pick: z
		.object({
			chosen: PickChoiceSchema,
			by: z.string(),
			at: z.string(),
		})
		.nullable(),
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

// The weekly cycle: command-1 writes a brief early on Sunday, and the meeting
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
	// Cards in each subject's room waiting on the admin, for the sidebar.
	openCards: z.record(z.enum(roomKeys), z.number()),
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
	// "metric" and "chart" are command-2's playbook: the metrics the admin likes in
	// each domain, and how they like charts drawn.
	// "style" is how the admin likes GitHub issues written, learned from the
	// drafts they edit before filing.
	kind: z.enum(['fact', 'metric', 'chart', 'style']),
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

// The Situation Report is the Command room's document on where Sunlo and each
// room stand now. command-1 and the admin write it, and every agent reads the
// whole of it at the top of every run, so it has a cap of its own.
export const SITREP = 'Situation Report'
export const SITREP_MAX = 4000
export const DOCUMENT_MAX = 40_000
export const documentMax = (name: string) =>
	name === SITREP ? SITREP_MAX : DOCUMENT_MAX

// A room's documents, as its room log lists them. Revision 0 is a document
// nobody has written yet.
export const DocumentSummarySchema = z.object({
	id: z.number(),
	room: z.enum(roomKeys),
	name: z.string(),
	revision: z.number(),
	// Null at revision 0.
	byName: z.string().nullable(),
	at: z.string().nullable(),
})
export type DocumentSummaryType = z.infer<typeof DocumentSummarySchema>

export const RevisionSchema = z.object({
	revision: z.number(),
	// One line on what changed. Empty when the admin left it out.
	summary: z.string(),
	// A crew key, or "admin:<uid>".
	by: z.string(),
	byName: z.string(),
	at: z.string(),
})
export type RevisionType = z.infer<typeof RevisionSchema>

export const RevisionTextSchema = RevisionSchema.extend({ text: z.string() })
export type RevisionTextType = z.infer<typeof RevisionTextSchema>

// A document's current text, and its revisions, newest first.
export const DocumentSchema = DocumentSummarySchema.extend({
	text: z.string(),
	revisions: z.array(RevisionSchema),
})
export type DocumentType = z.infer<typeof DocumentSchema>

export const OpenItemSchema = z.object({
	id: z.number(),
	title: z.string(),
	tag: z.string().nullable(),
	at: z.string(),
})
export type OpenItemType = z.infer<typeof OpenItemSchema>

// What a room knows about the admin: principles (philosophy, strategy,
// taste) and lessons (how they decide). Each room keeps its own. An entry
// counts only once the admin keeps it; until then it is a card in the room.
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

// One subject's room: its latest messages, and when this admin last opened it.
export const RoomThreadSchema = z.object({
	messages: z.array(CrewMessageSchema),
	seenAt: z.string().nullable(),
})
export type RoomThreadType = z.infer<typeof RoomThreadSchema>

// What only the Command room has: the weekly meeting.
export const CommandSchema = z.object({
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
	// The weekly meeting changed.
	| { type: 'command' }
	| { type: 'charter'; room: RoomKey }
	| { type: 'common-knowledge' }
	| { type: 'document'; room: RoomKey; id: number }
