import { z } from 'zod'

// The crew roster and the shapes the crew API sends. Imported by the Worker
// (worker/, .flue/) and by the app (src/), so it holds no runtime-specific code.

export const crewKeys = [
	'riker',
	'data',
	'product',
	'monitor',
	'moderator',
	'library',
	'growth',
] as const
export type CrewKey = (typeof crewKeys)[number]

export type CrewMember = {
	key: CrewKey
	name: string
	title: string
	// Shown under the title, and read by CLEF to decide who a message is for.
	looksAfter: Array<string>
	// null for an agent that does not run on a schedule.
	schedule: string | null
	// A planned agent has a workspace page but no agent behind it yet, so
	// messages for it stay in the room until it starts.
	active: boolean
}

export const crew: Record<CrewKey, CrewMember> = {
	riker: {
		key: 'riker',
		name: 'Riker',
		title: 'First officer',
		looksAfter: [
			"The admin's wishes, priorities and judgement, in the charter they keep together",
			'Where agents overlap or disagree',
			'What to bring to the admin, and what to decide or hold for them',
			'The weekly brief and the weekly meeting',
		],
		schedule: 'writes the weekly brief on Sunday at 04:00',
		active: true,
	},
	data: {
		key: 'data',
		name: 'Data',
		title: 'Science officer',
		looksAfter: [
			'Questions that need numbers, careful analysis or several thinking steps',
			'Charts and explorers built from the database',
			'Checking Riker’s instincts against the evidence',
		],
		schedule: null,
		active: true,
	},
	monitor: {
		key: 'monitor',
		name: 'Monitor',
		title: 'Site reliability',
		looksAfter: [
			'Errors, failed requests and slow pages',
			'The Model sandbox language',
			'Filing GitHub issues for anything broken',
		],
		schedule: null,
		active: false,
	},
	moderator: {
		key: 'moderator',
		name: 'Moderator',
		title: 'Community moderator',
		looksAfter: [
			'Comments, requests and phrases people write',
			'Personal data that people post by mistake',
		],
		schedule: null,
		active: false,
	},
	product: {
		key: 'product',
		name: 'Product',
		title: 'Product manager',
		looksAfter: [
			'The product plan for the next six weeks',
			'Retention, and how new people get started',
			"Turning the other agents' findings into work for you",
			"Pushing back on work that doesn't fit the plan",
		],
		schedule: 'runs daily at 07:00 UTC',
		active: true,
	},
	library: {
		key: 'library',
		name: 'Library',
		title: 'Learning content',
		looksAfter: [
			'The phrase library: duplicates, near-duplicates and gaps',
			'The phrase requests space, playlists and the template language',
			'How learners and phrases spread across languages',
			'When to hire a native-speaking translator',
		],
		schedule: null,
		active: false,
	},
	growth: {
		key: 'growth',
		name: 'Growth',
		title: 'Growth',
		looksAfter: ['Signups, invites and where new people come from'],
		schedule: null,
		active: false,
	},
}

export const crewList = crewKeys.map((key) => crew[key])

// The Enterprise is the admin's own ship: Riker, their first officer, and
// Data. They share one thread with the admin, and bring the admin what needs
// them. Every other agent is a ship of its own in the fleet.
export const bridgeKeys: ReadonlyArray<CrewKey> = ['riker', 'data']
export const fleetKeys = crewKeys.filter((key) => !bridgeKeys.includes(key))

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
// - question: any agent's question; change: a proposed change to its plan
// - From Riker or Data, in the Enterprise thread: decide (on hold until the
//   admin answers), confirm (acted in their stead; was that right?), know
//   (nothing to answer), escalate (needs more than the crew has), charter (a
//   proposed charter entry, `ref`) and brief (the weekly brief)
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
	// "room" for the Conference Room; "bridge" for the Enterprise thread; "dm"
	// for a card raised in a 1:1 chat, which shows in the agent's workspace.
	place: z.enum(['room', 'bridge', 'dm']),
	// Where the admin said, after sending, this message should have gone.
	corrected: RoutingSchema.nullable(),
})
export type CrewMessageType = z.infer<typeof CrewMessageSchema>

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
	// Cards in the Enterprise thread waiting on the admin, for the sidebar.
	enterpriseOpen: z.number(),
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

export const OpenItemSchema = z.object({
	id: z.number(),
	title: z.string(),
	tag: z.string().nullable(),
	at: z.string(),
})
export type OpenItemType = z.infer<typeof OpenItemSchema>

// What the bridge knows about the admin: principles (philosophy, strategy,
// taste) and lessons (how they decide). An entry counts only once the admin
// keeps it; until then it is a card in the Enterprise thread.
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

// The Enterprise thread, with the charter beside it.
export const EnterpriseSchema = z.object({
	messages: z.array(CrewMessageSchema),
	charter: z.array(CharterEntrySchema),
	seenAt: z.string().nullable(),
	// Set while this week's meeting is under way.
	meetingStartedAt: z.string().nullable(),
})
export type EnterpriseType = z.infer<typeof EnterpriseSchema>

export const WorkspaceSchema = z.object({
	agent: z.enum(crewKeys),
	todos: z.array(TodoSchema),
	memory: z.array(MemorySchema),
	openItems: z.array(OpenItemSchema),
	// This agent's cards from the room and from 1:1 chats, newest first.
	cards: z.array(CrewMessageSchema),
})
export type WorkspaceType = z.infer<typeof WorkspaceSchema>

// What the room pushes over its WebSocket.
export type RoomEvent =
	| { type: 'message'; message: CrewMessageType }
	| { type: 'workspace'; agent: CrewKey }
	// The Enterprise snapshot changed: the charter, or the meeting.
	| { type: 'enterprise' }
