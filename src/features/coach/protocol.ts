import * as v from 'valibot'

// The contract between the coach page and the coach agent
// (.flue/agents/coach.ts). The Worker imports this file too
// (tsconfig.worker.json), so it may import valibot and nothing else.

export const DECK_TARGET = 100

// Where .flue/app.ts mounts the coach agent's conversations.
export const COACH_MOUNT = '/api/coach/agent'

// A learner's coach conversation: their uid, the language, and a thread
// token that "Start over" replaces. The Worker refuses an id whose uid is not
// the caller's, so a learner can only reach their own conversations.
export const coachConversationId = (
	lang: string,
	uid: string,
	thread: string
) => `${lang}-${uid}.${thread}`

export function parseCoachConversationId(id: string) {
	const match = /^([a-z]{3})-([0-9a-f-]{36})\.([a-z0-9]{1,32})$/.exec(id)
	return match ? { lang: match[1], uid: match[2], thread: match[3] } : null
}

export const CoachInitialDataSchema = v.object({
	lang: v.pipe(v.string(), v.length(3)),
	translationLang: v.pipe(v.string(), v.length(3)),
	learnerName: v.nullable(v.pipe(v.string(), v.maxLength(80))),
})

export type CoachInitialData = v.InferOutput<typeof CoachInitialDataSchema>

const Ids = (max: number) => v.pipe(v.array(v.string()), v.maxLength(max))
const Limit = v.optional(
	v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(40))
)

export const coachToolInputs = {
	search_library: v.object({
		query: v.optional(
			v.pipe(
				v.string(),
				v.maxLength(200),
				v.description('What the learner wants to say or talk about.')
			)
		),
		tags: v.optional(
			v.pipe(
				Ids(10),
				v.description('Only phrases with at least one of these tags.')
			)
		),
		limit: Limit,
	}),
	find_similar: v.object({
		phrase_ids: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(20)),
		limit: Limit,
	}),
	list_tags: v.object({}),
	show_on_page: v.object({
		title: v.pipe(v.string(), v.minLength(1), v.maxLength(80)),
		subtitle: v.optional(v.pipe(v.string(), v.maxLength(160))),
		phrase_ids: Ids(60),
		request_ids: v.optional(Ids(20)),
		playlist_ids: v.optional(Ids(20)),
	}),
	add_to_deck: v.object({
		phrase_ids: v.pipe(v.array(v.string()), v.minLength(1), v.maxLength(60)),
	}),
	suggest_replies: v.object({
		replies: v.pipe(
			v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(40))),
			v.minLength(1),
			v.maxLength(4)
		),
	}),
	navigate: v.object({
		to: v.picklist([
			'deck',
			'review',
			'profile',
			'phrase',
			'playlist',
			'request',
		]),
		id: v.optional(
			v.pipe(
				v.string(),
				v.description('Required for phrase, playlist and request.')
			)
		),
	}),
} as const

export type CoachToolName = keyof typeof coachToolInputs

export const coachToolDescriptions: Record<CoachToolName, string> = {
	search_library:
		"Search this language's public library. With `query`, finds phrases, requests and sets by meaning or by spelling (English or the target language). With only `tags`, lists phrases carrying any of those tags. Nothing shows on the page until you call show_on_page.",
	find_similar:
		'Look-alike search: phrases close in meaning to the given phrases. Use it to grow a set from phrases the learner liked or added.',
	list_tags:
		"The tags used in this language's library, with how many phrases carry each one.",
	show_on_page:
		'Put a set on the page beside the chat. This is the only way the learner sees phrases: they can read them and add each one. Give the set a short title, like a chapter name. The page keeps earlier sets one tap away. Showing adds nothing to the deck.',
	add_to_deck:
		'Add phrases to the learner\'s deck as flashcards. Only when the learner asked for it, in general or specific terms ("add them", "add the food ones"). The page adds them and reports back with the learner\'s next message.',
	suggest_replies:
		'Offer the learner up to 4 short replies as buttons under your message. Write them as the learner would say them, 1 to 5 words each.',
	navigate:
		'Take the learner to another part of Sunlo, when they ask to go there. Leaves the coach.',
}

// What the page reads off a finished tool call. The agent returns these
// shapes; the page parses them and ignores a call that does not match.
export const ShowOnPageOutputSchema = v.object({
	title: v.string(),
	subtitle: v.nullable(v.string()),
	phrase_ids: v.array(v.string()),
	request_ids: v.array(v.string()),
	playlist_ids: v.array(v.string()),
})

export const SuggestRepliesOutputSchema = v.object({
	replies: v.array(v.string()),
})

export const AddToDeckOutputSchema = v.object({
	phrase_ids: v.array(v.string()),
})

export const NavigateOutputSchema = coachToolInputs.navigate

export type ShowOnPageOutput = v.InferOutput<typeof ShowOnPageOutputSchema>
export type NavigateTarget = v.InferOutput<typeof NavigateOutputSchema>
