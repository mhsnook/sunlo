import * as v from 'valibot'

// The contract between the coach page and the coach agent
// (.flue/agents/coach.ts). The Worker imports this file too
// (tsconfig.worker.json), so it may import valibot and nothing else.

export const DECK_TARGET = 100

// Where .flue/app.ts mounts the coach agent's conversations.
export const COACH_MOUNT = '/api/coach/agent'

// One coach conversation per learner, keyed on their uid, across every
// language they learn. The Worker refuses any other id, so a learner can
// only reach their own.
export const coachConversationId = (uid: string) => uid

export const isUid = (id: string) => /^[0-9a-f-]{36}$/.test(id)

// What the page is showing, sent as the first line of every message. The
// agent reads it from the delivery (useDelivery), so the model never picks
// the language its tools search.
export const CoachContextSchema = v.object({
	lang: v.pipe(v.string(), v.regex(/^[a-z]{3}$/)),
	translationLang: v.pipe(v.string(), v.regex(/^[a-z]{3}$/)),
	learnerName: v.nullable(v.pipe(v.string(), v.maxLength(80))),
})

export type CoachContext = v.InferOutput<typeof CoachContextSchema>

export const CONTEXT_PREFIX = '[Context: '

export const formatCoachContext = (context: CoachContext) =>
	`${CONTEXT_PREFIX}${JSON.stringify(context)}]`

export function parseCoachContext(body: string): CoachContext | null {
	const line = body.split('\n').find((l) => l.startsWith(CONTEXT_PREFIX))
	if (!line) return null
	try {
		const parsed = v.safeParse(
			CoachContextSchema,
			JSON.parse(line.slice(CONTEXT_PREFIX.length, -1))
		)
		return parsed.success ? parsed.output : null
	} catch {
		return null
	}
}

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
	draft_request: v.object({
		prompt: v.pipe(
			v.string(),
			v.minLength(3),
			v.maxLength(300),
			v.description(
				"The request in the learner's words, as they would post it: what they want to say, and when."
			)
		),
	}),
	navigate: v.object({
		to: v.picklist([
			'deck',
			'review',
			'profile',
			'requests',
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
	draft_request:
		'Put a request ("How do I say ...?") on the page for the learner to post to the community, already written out. Use it when the library has nothing for what they want and they agree to ask. The learner can edit it, and nothing is posted until they press the button.',
	navigate:
		'Take the learner to another part of Sunlo, when they ask to go there. Leaves the coach. To ask the community for a phrase, use draft_request instead, which keeps the learner here.',
}

// What the page reads off a finished tool call. The agent returns these
// shapes; the page parses them and ignores a call that does not match.
export const ShowOnPageOutputSchema = v.object({
	// The language the set is from, so each language's page shows its own.
	lang: v.string(),
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

export const DraftRequestOutputSchema = v.object({
	lang: v.string(),
	prompt: v.string(),
})

export const NavigateOutputSchema = coachToolInputs.navigate

export type ShowOnPageOutput = v.InferOutput<typeof ShowOnPageOutputSchema>
export type NavigateTarget = v.InferOutput<typeof NavigateOutputSchema>
