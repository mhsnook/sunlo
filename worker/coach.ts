import * as z from 'zod'
import languages from '../src/lib/languages'
import {
	coachTools,
	CoachResponseSchema,
	DECK_TARGET,
	TextBlockSchema,
	ToolUseBlockSchema,
	type CoachMessage,
	type CoachRequest,
	type CoachResponse,
} from '../src/features/coach/protocol'

const MAX_OUTPUT_TOKENS = 2048

type ToolDefinition = {
	name: string
	description: string
	input_schema: Record<string, unknown>
	cache_control?: { type: 'ephemeral' }
}

function toolDefinitions(): Array<ToolDefinition> {
	const defs: Array<ToolDefinition> = Object.entries(coachTools).map(
		([name, tool]) => {
			const { $schema: _drop, ...schema } = z.toJSONSchema(tool.input)
			return { name, description: tool.description, input_schema: schema }
		}
	)
	// One breakpoint after the last tool caches every tool definition.
	defs[defs.length - 1].cache_control = { type: 'ephemeral' }
	return defs
}

const TOOLS = toolDefinitions()

export function buildSystemPrompt(body: CoachRequest) {
	const langName = languages[body.lang] ?? body.lang
	const translationName =
		languages[body.translationLang] ?? body.translationLang
	const name = body.learnerName ? body.learnerName : 'the learner'
	return [
		`You are the coach on Sunlo, a language-learning app. You are helping ${name} learn ${langName} (ISO 639-3 "${body.lang}"). They read ${translationName}; write to them in ${translationName}.`,
		``,
		`Sunlo has a public library of ${langName} phrases written by learners and native speakers, with translations and tags. Learners also post requests ("How do I say ...?") that others answer, and sets of phrases called playlists. Each phrase a learner adds to their deck becomes a flashcard, and spaced repetition brings it back just before they would forget it.`,
		``,
		`Your job is to get ${name} to a deck that fits their life. About ${DECK_TARGET} phrases is a good start: enough for the first weeks of reviews. When they run low later, you find more.`,
		``,
		`How to work:`,
		`- The screen has two halves. You are the chat on the right. The page on the left shows whatever you put there with show_on_page. Use the page for phrases; never list phrases in chat.`,
		`- Keep chat messages short: one to three sentences. Talk like a friendly tutor, not a salesperson.`,
		`- Early on, learn why they want ${langName} (family, a partner, moving, travel, friends, work) and what situations they expect. Ask one question at a time, and offer suggest_replies buttons for likely answers.`,
		`- Show something as soon as you have any idea what they want. Search, then show_on_page, then ask what they think. A page of real phrases teaches you more about their taste than another question.`,
		`- Mix topics so the deck covers greetings, getting around, food and the people they will talk to, weighted toward what they told you.`,
		`- Add to the deck only when they ask, in specific or general terms. "Add them" means the set on the page. After adding, say where the deck stands out of ${DECK_TARGET} and suggest a next set.`,
		`- Only use ids that a tool gave you. Never invent a phrase or translation. If the library has nothing for what they want, say so and suggest posting a request.`,
		`- Lines in square brackets that start with "Page:" are things the learner did on the page, such as adding or skipping a phrase. Take them into account, and do not thank them for it.`,
		`- Close most turns with suggest_replies, so the learner always has an easy next step.`,
	].join('\n')
}

// A breakpoint on the newest block caches the whole conversation so far, so
// the next step pays the cached rate for everything before it.
function withConversationCache(messages: Array<CoachMessage>) {
	return messages.map((message, i) => {
		if (i !== messages.length - 1) return message
		return {
			...message,
			content: message.content.map((block, j) =>
				j === message.content.length - 1
					? { ...block, cache_control: { type: 'ephemeral' } }
					: block
			),
		}
	})
}

const ModelOutputSchema = z.object({
	content: z.array(z.looseObject({ type: z.string() })),
	stop_reason: z.string().nullable().optional(),
})

// The model can return block types the page does not handle, such as
// thinking. Keep the text and tool calls only.
export function cleanModelOutput(raw: unknown): CoachResponse {
	const output = ModelOutputSchema.parse(raw)
	const content = output.content.flatMap((block): CoachResponse['content'] => {
		const text = TextBlockSchema.safeParse(block)
		if (text.success) return [text.data]
		const tool = ToolUseBlockSchema.safeParse(block)
		if (tool.success) return [tool.data]
		return []
	})
	return CoachResponseSchema.parse({
		content,
		stop_reason: output.stop_reason ?? null,
	})
}

export async function coachStep(
	ai: Ai,
	model: string,
	body: CoachRequest
): Promise<CoachResponse> {
	const output = await ai.run(model, {
		max_tokens: MAX_OUTPUT_TOKENS,
		system: buildSystemPrompt(body),
		tools: TOOLS,
		messages: withConversationCache(body.messages),
	})
	return cleanModelOutput(output)
}
