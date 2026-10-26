import { z } from 'zod'

// The crew roster and the shapes the crew API sends. Imported by the Worker
// (worker/, .flue/) and by the app (src/), so it holds no runtime-specific code.

export const crewKeys = [
	'monitor',
	'moderator',
	'product',
	'languages',
	'curator',
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
	languages: {
		key: 'languages',
		name: 'Languages',
		title: 'Language lead',
		looksAfter: [
			'How learners and phrases spread across languages',
			'When to hire a native-speaking translator',
		],
		schedule: null,
		active: false,
	},
	curator: {
		key: 'curator',
		name: 'Curator',
		title: 'Library curator',
		looksAfter: [
			'The shape of the phrase requests space',
			'Duplicate and near-duplicate phrases',
			'Playlists and the template language',
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

export const isCrewKey = (value: string): value is CrewKey =>
	(crewKeys as ReadonlyArray<string>).includes(value)

// Every @name in the text that names a crew member, in roster order.
export function mentionedCrew(text: string): Array<CrewKey> {
	const names = new Set(
		[...text.matchAll(/@([a-z]+)/gi)].map((match) => match[1].toLowerCase())
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

export const CrewMessageSchema = z.object({
	id: z.string(),
	at: z.string(),
	// A crew key for an agent, or "admin:<uid>".
	author: z.string(),
	authorName: z.string(),
	body: z.string(),
	// Set on admin messages only.
	routing: RoutingSchema.nullable(),
	// Buttons the admin answers with. A "change" card is a proposed change to
	// the agent's plan, with "Do it" and "Not yet".
	card: z
		.object({
			kind: z.enum(['question', 'change']),
			title: z.string().nullable(),
			actions: z.array(ActionSchema),
		})
		.nullable(),
	answer: z
		.object({
			actionId: z.string(),
			label: z.string(),
			by: z.string(),
			at: z.string(),
		})
		.nullable(),
	// "room" for the crew room; "dm" for a card raised in a 1:1 chat, which
	// shows in the agent's workspace but not in the room.
	place: z.enum(['room', 'dm']),
})
export type CrewMessageType = z.infer<typeof CrewMessageSchema>

export const AgentStatusSchema = z.object({
	state: z.enum(['idle', 'working']),
	since: z.string(),
})
export type AgentStatusType = z.infer<typeof AgentStatusSchema>

export const RoomSnapshotSchema = z.object({
	messages: z.array(CrewMessageSchema),
	statuses: z.record(z.string(), AgentStatusSchema),
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

export const WorkspaceSchema = z.object({
	agent: z.enum(crewKeys),
	todos: z.array(TodoSchema),
	memory: z.array(MemorySchema),
	openItems: z.array(OpenItemSchema),
	// This agent's cards from the room and from 1:1 chats, newest first.
	cards: z.array(CrewMessageSchema),
	status: AgentStatusSchema.nullable(),
})
export type WorkspaceType = z.infer<typeof WorkspaceSchema>

// What the room pushes over its WebSocket.
export type RoomEvent =
	| { type: 'message'; message: CrewMessageType }
	| { type: 'status'; agent: CrewKey; status: AgentStatusType }
	| { type: 'workspace'; agent: CrewKey }
