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
			'Reimagining screens: several mockups that differ on purpose, for the admin to pick from',
			'How Sunlo looks and feels, and how much it asks of people at once',
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

// A side-thread's replies live in a place of their own, named for the
// thread's first message, so no query of a room's timeline meets them.
export const ThreadPlaceSchema = z.templateLiteral(['thread:', z.string()])
export type ThreadPlaceType = z.infer<typeof ThreadPlaceSchema>
export const threadPlace = (root: string): ThreadPlaceType => `thread:${root}`

export const MessagePlaceSchema = z.union([PlaceSchema, ThreadPlaceSchema])
export type MessagePlaceType = z.infer<typeof MessagePlaceSchema>
export const isThreadPlace = (
	place: MessagePlaceType
): place is ThreadPlaceType => place.startsWith('thread:')

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
const MENTION = /(?<![\w.])@([a-z][a-z0-9-]*(?:['’][a-z0-9-]+)?)/gi
const handlesIn = (text: string) =>
	[...text.matchAll(MENTION)].map((match) => match[1].toLowerCase())

export function mentionedCrew(text: string): Array<CrewKey> {
	const named = new Set(handlesIn(text).map(resolveHandle))
	return crewKeys.filter((key) => named.has(key))
}

// A trailing "..." or "…" means "more is coming": CLEF never wakes anyone
// for it, and the next message that does wake someone carries it along.
export const endsWithEllipsis = (text: string) => /(\.\.\.|…)\s*$/.test(text)

// The handles that address the whole crew. No crew member's handle, key or
// room may be one of these (roster.test.ts checks).
export const EVERYONE_HANDLES = ['channel', 'crew', 'everyone', 'all'] as const

const everyoneHandles: ReadonlySet<string> = new Set(EVERYONE_HANDLES)

export const mentionsEveryone = (text: string) =>
	handlesIn(text).some((handle) =>
		everyoneHandles.has(handle.split(APOSTROPHE)[0])
	)

export const RoutingSchema = z.object({
	// "route" and "everyone" both wake `agents`: "everyone" is a message to
	// the whole crew, which wakes only the agents CLEF says it needs.
	kind: z.enum(['stack', 'room', 'route', 'everyone']),
	agents: z.array(z.enum(crewKeys)),
	// Who decided: a fixed rule ("..." or an @mention), the CLEF model, or
	// the admin, by changing the chip before sending.
	by: z.enum(['rule', 'model', 'you']),
})
export type RoutingType = z.infer<typeof RoutingSchema>

// The started agents among `agents`, once each, in roster order. A planned
// agent cannot wake yet.
const activeAmong = (agents: ReadonlyArray<CrewKey>) =>
	crewKeys.filter((key) => agents.includes(key) && crew[key].active)

export const activeCrew = activeAmong(crewKeys)

// A routing that wakes the started agents among `agents`. When none of them
// can wake, the message waits in the room.
function wakeRouting(
	kind: 'route' | 'everyone',
	agents: ReadonlyArray<CrewKey>,
	by: RoutingType['by']
): RoutingType {
	const active = activeAmong(agents)
	return active.length
		? { kind, agents: active, by }
		: { kind: 'room', agents: [], by }
}

export const routeTo = (
	agents: ReadonlyArray<CrewKey>,
	by: RoutingType['by']
) => wakeRouting('route', agents, by)

export const everyoneTo = (
	agents: ReadonlyArray<CrewKey>,
	by: RoutingType['by']
) => wakeRouting('everyone', agents, by)

const listFormat = new Intl.ListFormat('en', { type: 'conjunction' })

// "Cmdr Riker, Data, and O'Brien".
export const crewNames = (agents: ReadonlyArray<CrewKey>) =>
	listFormat.format(agents.map(displayName))

// The two fixed rules, checked before CLEF's model: a trailing "..." stacks,
// and an @mention of someone in `among` routes. Null when neither applies,
// and for an @everyone, whose agents the caller picks.
export function fixedRouting(
	text: string,
	among: ReadonlyArray<CrewKey> = crewKeys
): RoutingType | null {
	if (endsWithEllipsis(text)) return { kind: 'stack', agents: [], by: 'rule' }
	if (mentionsEveryone(text)) return null
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

// An image the room keeps (the `image` table), as a message carries it.
export const MessageImageSchema = z.object({
	id: z.number().int(),
	width: z.number().int(),
	height: z.number().int(),
})
export type MessageImageType = z.infer<typeof MessageImageSchema>

// One of product-2's mockups: HTML it wrote, which the room keeps with the
// picture the Worker took of it. `label` is its letter on the card.
export const SketchSchema = z.object({
	id: z.number(),
	label: z.string(),
	idea: z.string(),
	frame: z.enum(['phone', 'desktop']),
})
export type SketchType = z.infer<typeof SketchSchema>
export const SKETCHES_PER_HOUR = 12

// ---- The painter ------------------------------------------------------------

// The image models product-2's painter can use, all through the Worker's AI
// binding. `references` is how many reference images a model takes; `svg`
// marks a model that answers with an SVG. Costs are Cloudflare's list prices.
export const PAINTER_MODELS = {
	'black-forest-labs/flux-3-image-klein': {
		label: 'FLUX.3 Klein',
		references: 10,
		svg: false,
		cost: 'about $0.009 an image',
	},
	'krea/krea-3': {
		label: 'Krea 3',
		references: 8,
		svg: false,
		cost: '$0.03 an image, plus $0.07 for each reference image',
	},
	'recraft/recraftv4-1-flash': {
		label: 'Recraft V4.1 Flash',
		references: 0,
		svg: false,
		cost: '$0.007 an image',
	},
	'recraft/recraftv4-1-vector': {
		label: 'Recraft V4.1 Vector (SVG)',
		references: 0,
		svg: true,
		cost: '$0.08 an image',
	},
} as const
export type PainterModel = keyof typeof PAINTER_MODELS
export const painterModelIds = Object.keys(PAINTER_MODELS) as [
	PainterModel,
	...Array<PainterModel>,
]
export const PainterModelSchema = z.enum(painterModelIds)

// The aspect ratios every painter model takes.
export const ASPECT_RATIOS = [
	'1:1',
	'4:5',
	'3:4',
	'2:3',
	'9:16',
	'5:4',
	'4:3',
	'3:2',
	'16:9',
] as const
export const PAINTINGS_PER_HOUR = 12
// A painting can be bigger than one row holds; the image store splits it
// into parts (worker/crew/image-store.ts).
export const MAX_PAINTING_BYTES = 8_000_000
export const MAX_STYLES_PER_PAINTING = 4
export const MAX_PAINTER_REFERENCES = 4
export const MAX_STYLE_EXAMPLES = 4

// A style the painter paints in: the admin manages these in the Product
// room's log. `prompt` is the text that sets the style, ahead of
// product-2's brief.
export const PainterStyleSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string(),
	prompt: z.string(),
	model: PainterModelSchema,
	examples: z.array(MessageImageSchema),
	at: z.string(),
})
export type PainterStyleType = z.infer<typeof PainterStyleSchema>

export const PainterStyleInputSchema = z.object({
	name: z.string().trim().min(1).max(60),
	description: z.string().trim().min(1).max(200),
	prompt: z.string().trim().min(1).max(2000),
	model: PainterModelSchema,
	// Image ids, in order.
	examples: z.array(z.number().int()).max(MAX_STYLE_EXAMPLES).default([]),
})
export type PainterStyleInputType = z.infer<typeof PainterStyleInputSchema>

// An SVG the room keeps (the `svg` table), with the PNG it was rendered to
// when that worked.
export const SvgRefSchema = z.object({
	id: z.number(),
	title: z.string(),
	width: z.number(),
	height: z.number(),
	png: z.number().nullable(),
})
export type SvgRefType = z.infer<typeof SvgRefSchema>
// The SVG table keeps one in a row, and a row holds at most 2 MB.
export const MAX_SVG_BYTES = 1_800_000
export const SVGS_PER_HOUR = 24

// One painting on a paintings card: an image, an SVG from a vector model,
// or the error its model gave. `label` is its letter on the card.
export const PaintingSchema = z.object({
	id: z.number(),
	label: z.string(),
	style: z.string(),
	model: PainterModelSchema,
	image: MessageImageSchema.nullable(),
	svg: SvgRefSchema.nullable(),
	error: z.string().nullable(),
})
export type PaintingType = z.infer<typeof PaintingSchema>

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
// - sketches: product-2's mockups (`sketches`), one action for each, which
//   picks it
// - paintings: the painter's paintings (`paintings`), one action for each
//   that worked
// - svgs: SVGs product-2 drew (`svgs`), with nothing to answer
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
		'sketches',
		'paintings',
		'svgs',
	]),
	title: z.string().nullable(),
	// Empty for a card with nothing to answer.
	actions: z.array(ActionSchema),
	// The charter entry a "charter" card proposes.
	ref: z.number().nullable(),
	draft: GithubDraftSchema.optional(),
	sketches: z.array(SketchSchema).optional(),
	paintings: z.array(PaintingSchema).optional(),
	svgs: z.array(SvgRefSchema).optional(),
})
export type CardType = z.infer<typeof CardSchema>

// The biggest image the admin can upload. The app shrinks a pasted image
// under it.
export const MAX_UPLOAD_BYTES = 1_800_000
// The app scales a pasted image down to this many pixels on its long side.
export const MAX_IMAGE_SIDE = 2000
export const MAX_IMAGES_PER_MESSAGE = 6
// The types the room stores, and serves back with the same content type.
export const IMAGE_TYPES = [
	'image/png',
	'image/jpeg',
	'image/webp',
	'image/gif',
] as const
export type ImageMimeType = (typeof IMAGE_TYPES)[number]

// What an agent reads for a message's images: a line each.
export const imageLine = (image: MessageImageType) =>
	`[image ${image.id} attached, ${image.width}×${image.height}]`

export const withImageLines = (
	body: string,
	images: ReadonlyArray<MessageImageType>
) => [body, ...images.map(imageLine)].filter(Boolean).join('\n')

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
	// Empty when the message is only images.
	body: z.string(),
	images: z.array(MessageImageSchema),
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
			// The admin's own message they wrote with the answer.
			noteId: z.string().optional(),
		})
		.nullable(),
	place: MessagePlaceSchema,
	// Where the admin said, after sending, this message should have gone.
	corrected: RoutingSchema.nullable(),
	// The room's list of the edits an agent's run made, not the agent speaking.
	receipt: z.boolean(),
	// An associate's answer that differs from the principal's, which the app
	// shows beside it: the id of the principal's message.
	otherViewOf: z.string().nullable(),
	// A reply in a side-thread: the id of the thread's first message.
	parent: z.string().nullable(),
	// On a side-thread's first message: who was asked, and when the thread
	// closed (null while open).
	thread: z
		.object({ with: z.enum(crewKeys), closedAt: z.string().nullable() })
		.nullable(),
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

// Anything a message or a document writes about a document links to it: an
// ordinary Markdown link whose target is "doc:" and the document's id, as in
// `[the Roadmap](doc:3)`. The app opens that document; a target no document
// answers to stays plain text. The id never changes, unlike a name.
export const DOCUMENT_SCHEME = 'doc:'

export const documentHref = (id: number) => `${DOCUMENT_SCHEME}${id}`

// The id a link target names, or null for an ordinary URL.
export function documentIdInHref(href: string): number | null {
	const match = /^doc:(\d+)$/i.exec(href)
	return match ? Number(match[1]) : null
}

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
	// The side-thread replies to these messages, by the id of each thread's
	// first message.
	replies: z.record(z.string(), z.array(CrewMessageSchema)),
	seenAt: z.string().nullable(),
})
export type RoomThreadType = z.infer<typeof RoomThreadSchema>

// What only the Command room has: the weekly meeting.
export const CommandSchema = z.object({
	// Set while this week's meeting is under way.
	meetingStartedAt: z.string().nullable(),
})
export type CommandType = z.infer<typeof CommandSchema>

// An officer's persona: the admin's own text once they have written one,
// otherwise the one in code. `original` is the code's, for restoring.
export const CharacterSchema = z.object({
	text: z.string(),
	original: z.string(),
	editedAt: z.string().nullable(),
})
export type CharacterType = z.infer<typeof CharacterSchema>

// A change the admin made to an agent's workspace or character, which the
// agent hears about on its next run.
export const AdminChangeSchema = z.object({
	what: z.string(),
	at: z.string(),
})
export type AdminChangeType = z.infer<typeof AdminChangeSchema>

export const WorkspaceSchema = z.object({
	agent: z.enum(crewKeys),
	// Null for a seat that has not started.
	character: CharacterSchema.nullable(),
	todos: z.array(TodoSchema),
	memory: z.array(MemorySchema),
	openItems: z.array(OpenItemSchema),
	// This agent's cards from the Common Room and its own room, newest first.
	cards: z.array(CrewMessageSchema),
})
export type WorkspaceType = z.infer<typeof WorkspaceSchema>

// One step of an agent's run: a tool it called, or a block of the model's
// thinking.
export const RunStepSchema = z.object({
	// The tool call's id, or "<turn>:<block>" for thinking.
	id: z.string(),
	kind: z.enum(['tool', 'thinking']),
	state: z.enum(['running', 'done', 'failed']),
	// The step in words for each state: "Running a query", "Ran a query",
	// "Failed to run a query".
	title: z.object({
		running: z.string(),
		done: z.string(),
		failed: z.string(),
	}),
	// The tool's key input, such as the SQL it ran, or the thinking text.
	// Truncated.
	detail: z.string().nullable(),
	// Why the tool failed. Truncated.
	error: z.string().nullable(),
	at: z.string(),
	ms: z.number().nullable(),
})
export type RunStepType = z.infer<typeof RunStepSchema>

// One run of an agent: in its running conversation, or in a side-thread.
// The room keeps the last few of each agent's runs.
export const RunSchema = z.object({
	id: z.number(),
	agent: z.enum(crewKeys),
	// The side-thread's first message, for a run in a side-thread.
	thread: z.string().nullable(),
	startedAt: z.string(),
	endedAt: z.string().nullable(),
	outcome: z.enum(['working', 'done', 'failed']),
	// What the run produced: the agent's last message, else its receipt,
	// else the message that woke it. Null while it runs.
	messageId: z.string().nullable(),
	steps: z.array(RunStepSchema),
	// Steps left out to keep the list short: the run took this many more.
	dropped: z.number(),
	// Why a failed run stopped, as Flue reported it.
	error: z.string().nullable(),
})
export type RunType = z.infer<typeof RunSchema>

// What the room pushes over its WebSocket.
export type RoomEvent =
	| { type: 'message'; message: CrewMessageType }
	// A side-thread reply, with the room its thread is in.
	| { type: 'reply'; place: PlaceType; message: CrewMessageType }
	| { type: 'workspace'; agent: CrewKey }
	// The weekly meeting changed.
	| { type: 'command' }
	| { type: 'charter'; room: RoomKey }
	| { type: 'common-knowledge' }
	| { type: 'document'; room: RoomKey; id: number }
	| { type: 'painter-styles' }
	// A run started, took a step, or ended.
	| { type: 'run'; run: RunType }
