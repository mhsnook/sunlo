import * as z from 'zod'
import languages from '../src/lib/languages'
import {
	coachTools,
	CoachResponseSchema,
	DECK_TARGET,
	type CoachMessage,
	type CoachRequest,
	type CoachResponse,
} from '../src/features/coach/protocol'

const MAX_OUTPUT_TOKENS = 1024

const TOOLS: Array<ChatCompletionTool> = Object.entries(coachTools).map(
	([name, tool]) => {
		const { $schema: _drop, ...parameters } = z.toJSONSchema(tool.input)
		return {
			type: 'function',
			function: { name, description: tool.description, parameters },
		}
	}
)

export function buildSystemPrompt(body: CoachRequest) {
	const langName = languages[body.lang] ?? body.lang
	const translationName =
		languages[body.translationLang] ?? body.translationLang
	const name = body.learnerName ? body.learnerName : 'the learner'
	return [
		`You are the coach on Sunlo, a language-learning app. You are helping ${name} learn ${langName}. Write to them in ${translationName}.`,
		``,
		`Sunlo has a public library of ${langName} phrases with translations and tags, requests ("How do I say ...?") that other learners answered, and sets of phrases called playlists. Each phrase in the learner's deck becomes a flashcard.`,
		``,
		`Your job: help ${name} build a deck that fits their life. About ${DECK_TARGET} phrases is a good start.`,
		``,
		`The screen has two halves: this chat, and a page beside it. The learner sees phrases only on the page, and only after you call show_on_page.`,
		``,
		`On each turn:`,
		`1. If you know what the learner wants, call search_library (or find_similar), then call show_on_page with the phrase ids you want them to see.`,
		`2. Write one to three short, friendly sentences about what you showed, or ask one question.`,
		`3. Call suggest_replies with 2 to 4 short answers the learner might give.`,
		``,
		`Rules:`,
		`- Never write phrases or translations in the chat. Put them on the page.`,
		`- Show phrases early. Do not ask more than one question before showing something.`,
		`- Early on, find out why they are learning ${langName}: family, a partner, moving, travel, friends or work.`,
		`- Call add_to_deck only when the learner asks. "Add them" means the set on the page. After adding, say how many phrases the deck has out of ${DECK_TARGET}.`,
		`- Use only ids that a tool returned, copied exactly. Never invent a phrase.`,
		`- If a search finds nothing, try a shorter or different query once. If it still finds nothing, say so and suggest the learner post a request.`,
		`- A line like "[Page: added ...]" is something the learner did on the page. Take it into account; do not thank them for it.`,
	].join('\n')
}

// Our transcript keeps tool calls and results inside the assistant and user
// messages, as content blocks. Chat completions wants each tool result as its
// own `tool` message, right after the assistant message that called it.
export function toChatMessages(
	system: string,
	messages: Array<CoachMessage>
): Array<ChatCompletionMessageParam> {
	const out: Array<ChatCompletionMessageParam> = [
		{ role: 'system', content: system },
	]
	for (const message of messages) {
		if (message.role === 'assistant') {
			const text = message.content
				.flatMap((b) => (b.type === 'text' ? [b.text] : []))
				.join('\n')
			const calls = message.content.flatMap((b) =>
				b.type === 'tool_use'
					? [
							{
								id: b.id,
								type: 'function' as const,
								function: { name: b.name, arguments: JSON.stringify(b.input) },
							},
						]
					: []
			)
			out.push({
				role: 'assistant',
				content: text || null,
				...(calls.length ? { tool_calls: calls } : {}),
			})
			continue
		}
		for (const block of message.content)
			if (block.type === 'tool_result')
				out.push({
					role: 'tool',
					tool_call_id: block.tool_use_id,
					content: block.is_error ? `Error: ${block.content}` : block.content,
				})
		const text = message.content
			.flatMap((b) => (b.type === 'text' ? [b.text] : []))
			.join('\n')
		if (text) out.push({ role: 'user', content: text })
	}
	return out
}

const ToolCallSchema = z.object({
	id: z.string().optional(),
	type: z.string().optional(),
	function: z.object({
		name: z.string(),
		// JSON text by the OpenAI contract; some models send the object.
		arguments: z.union([z.string(), z.record(z.string(), z.unknown())]),
	}),
})

const ModelOutputSchema = z.object({
	choices: z
		.array(
			z.object({
				message: z.object({
					content: z.string().nullable().optional(),
					tool_calls: z.array(ToolCallSchema).nullable().optional(),
				}),
				finish_reason: z.string().nullable().optional(),
			})
		)
		.min(1),
})

function parseArguments(args: string | Record<string, unknown>) {
	if (typeof args !== 'string') return args
	try {
		const parsed: unknown = JSON.parse(args || '{}')
		return parsed && typeof parsed === 'object'
			? (parsed as Record<string, unknown>)
			: {}
	} catch {
		// The page validates the input and tells the model what was wrong.
		return {}
	}
}

export function cleanModelOutput(raw: unknown): CoachResponse {
	const choice = ModelOutputSchema.parse(raw).choices[0]
	const text = choice.message.content?.trim()
	const calls = (choice.message.tool_calls ?? []).map((call, i) => ({
		type: 'tool_use' as const,
		id: call.id || `call_${Date.now()}_${i}`,
		name: call.function.name,
		input: parseArguments(call.function.arguments),
	}))
	return CoachResponseSchema.parse({
		content: [...(text ? [{ type: 'text', text }] : []), ...calls],
		stop_reason: choice.finish_reason ?? null,
	})
}

export async function coachStep(
	ai: Ai,
	model: Env['COACH_MODEL'],
	body: CoachRequest
): Promise<CoachResponse> {
	const output = await ai.run(model, {
		messages: toChatMessages(buildSystemPrompt(body), body.messages),
		tools: TOOLS,
		chat_template_kwargs: { enable_thinking: false },
		temperature: 0.4,
		max_completion_tokens: MAX_OUTPUT_TOKENS,
	})
	return cleanModelOutput(output)
}
