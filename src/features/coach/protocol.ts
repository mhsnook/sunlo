import * as z from 'zod'

// The contract between the coach page and `POST /api/coach`. The worker
// imports this file too (tsconfig.worker.json), so it may import zod and
// nothing else.

export const DECK_TARGET = 100

// The API needs a user message before the coach's fixed opening line. The
// learner never sees this one.
export const KICKOFF_TEXT = '[Page: the learner opened the coach.]'

const MAX_TEXT = 8000
const MAX_TOOL_RESULT = 24_000

export const TextBlockSchema = z.object({
	type: z.literal('text'),
	text: z.string().min(1).max(MAX_TEXT),
})

export const ToolUseBlockSchema = z.object({
	type: z.literal('tool_use'),
	id: z.string().min(1).max(100),
	name: z.string().min(1).max(64),
	input: z.record(z.string(), z.unknown()),
})

export const ToolResultBlockSchema = z.object({
	type: z.literal('tool_result'),
	tool_use_id: z.string().min(1).max(100),
	content: z.string().max(MAX_TOOL_RESULT),
	is_error: z.boolean().optional(),
})

export type TextBlock = z.infer<typeof TextBlockSchema>
export type ToolUseBlock = z.infer<typeof ToolUseBlockSchema>
export type ToolResultBlock = z.infer<typeof ToolResultBlockSchema>

export const CoachMessageSchema = z.discriminatedUnion('role', [
	z.object({
		role: z.literal('user'),
		content: z
			.array(z.union([TextBlockSchema, ToolResultBlockSchema]))
			.min(1)
			.max(24),
	}),
	z.object({
		role: z.literal('assistant'),
		content: z
			.array(z.union([TextBlockSchema, ToolUseBlockSchema]))
			.min(1)
			.max(24),
	}),
])

export type CoachMessage = z.infer<typeof CoachMessageSchema>

export const CoachRequestSchema = z.object({
	lang: z.string().length(3),
	translationLang: z.string().length(3),
	learnerName: z.string().max(80).nullable(),
	messages: z.array(CoachMessageSchema).min(1).max(160),
})

export type CoachRequest = z.infer<typeof CoachRequestSchema>

export const CoachResponseSchema = z.object({
	content: z.array(z.union([TextBlockSchema, ToolUseBlockSchema])),
	stop_reason: z.string().nullable(),
})

export type CoachResponse = z.infer<typeof CoachResponseSchema>

const PhraseIds = z.array(z.string()).max(60)
const Limit = z.number().int().min(1).max(40).optional()

// The page runs every tool, against the learner's own collections. The
// worker only describes them to the model.
export const coachTools = {
	search_library: {
		description:
			"Search this language's public library. With `query`, finds phrases, requests and sets by meaning (works in English or the target language). With only `tags`, lists phrases carrying any of those tags. Results say which phrases are already in the learner's deck. Nothing shows on the page until you call show_on_page.",
		input: z.object({
			query: z
				.string()
				.max(200)
				.optional()
				.describe('What the learner wants to say or talk about.'),
			tags: z
				.array(z.string())
				.max(10)
				.optional()
				.describe('Only phrases with at least one of these tags.'),
			not_in_deck: z
				.boolean()
				.optional()
				.describe("Leave out phrases already in the learner's deck."),
			limit: Limit,
		}),
	},
	find_similar: {
		description:
			'Look-alike search: phrases close in meaning to the given phrases. Use it to grow a set from phrases the learner liked or added.',
		input: z.object({
			phrase_ids: z.array(z.string()).min(1).max(20),
			not_in_deck: z.boolean().optional(),
			limit: Limit,
		}),
	},
	list_tags: {
		description:
			"The tags used in this language's library, with how many phrases carry each one.",
		input: z.object({}),
	},
	get_deck: {
		description:
			"The learner's deck for this language: how many phrases are in it, the tags they cover, and the most recently added phrases.",
		input: z.object({}),
	},
	show_on_page: {
		description:
			'Put a set on the main page, beside the chat. This is how the learner sees phrases: they can read them and add or skip each one. Give the set a short title, like a chapter name. Call it whenever you have phrases worth looking at; the page keeps earlier sets one tap away. Nothing is added to the deck by showing it.',
		input: z.object({
			title: z.string().min(1).max(80),
			subtitle: z.string().max(160).optional(),
			phrase_ids: PhraseIds,
			request_ids: z.array(z.string()).max(20).optional(),
			playlist_ids: z.array(z.string()).max(20).optional(),
		}),
	},
	add_to_deck: {
		description:
			'Add phrases to the learner\'s deck as flashcards. Only do this when the learner asked for it, in general or specific terms ("add them", "add the food ones"). Creates the deck if the learner has none for this language.',
		input: z.object({ phrase_ids: z.array(z.string()).min(1).max(60) }),
	},
	suggest_replies: {
		description:
			'Offer the learner up to 4 short replies as buttons under your message. Write them as the learner would say them, 1 to 5 words each.',
		input: z.object({
			replies: z.array(z.string().min(1).max(40)).min(1).max(4),
		}),
	},
	navigate: {
		description:
			'Take the learner to another part of Sunlo, when they ask to go there. Leaves the coach.',
		input: z.object({
			to: z.enum([
				'deck',
				'review',
				'profile',
				'phrase',
				'playlist',
				'request',
			]),
			id: z
				.string()
				.optional()
				.describe('Required for phrase, playlist and request.'),
		}),
	},
} as const

export type CoachToolName = keyof typeof coachTools

export const isCoachToolName = (name: string): name is CoachToolName =>
	name in coachTools

export type CoachToolInput<N extends CoachToolName> = z.infer<
	(typeof coachTools)[N]['input']
>
