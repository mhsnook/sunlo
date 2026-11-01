import languages from '@/lib/languages'
import { coachStep } from './api'
import { activeIds, deckStatusByPhrase, preloadLibrary } from './library'
import {
	KICKOFF_TEXT,
	type TextBlock,
	type ToolResultBlock,
	type ToolUseBlock,
} from './protocol'
import {
	getThread,
	logId,
	updateThread,
	useCoachBusyStore,
	type CoachLogEntry,
} from './store'
import { runTool, type ToolContext } from './tools'
import { appendUserBlocks, compactTranscript } from './transcript'

const MAX_STEPS = 8
const MAX_RESULT_CHARS = 20_000

const entry = (kind: CoachLogEntry['kind'], text: string): CoachLogEntry => ({
	id: logId(),
	kind,
	text,
})

export const OPENING_REPLIES = ['Family', 'A partner', 'Moving there', 'Travel']

// The coach's first message is fixed, so the page can show it before any
// model call. sendToCoach writes the same words into the transcript.
export function openingLine(
	learnerName: string | null,
	lang: string,
	size: number
) {
	const name = languages[lang] ?? lang
	const hello = learnerName ? `Hi ${learnerName}!` : 'Hi!'
	const deck = size
		? `You have ${size} phrases in your ${name} deck.`
		: `Let's build your ${name} deck together.`
	return `${hello} ${deck} What brings you to ${name}?`
}

export type SendOptions = {
	ctx: ToolContext
	learnerName: string | null
	text: string
}

export async function sendToCoach({ ctx, learnerName, text }: SendOptions) {
	const { key } = ctx
	if (useCoachBusyStore.getState()[key]) return
	useCoachBusyStore.setState({ [key]: true })

	try {
		const notes = getThread(key).pageNotes
		const blocks: Array<TextBlock> = [
			...(notes.length
				? [
						{
							type: 'text' as const,
							text: notes.map((n) => `[Page: ${n}]`).join('\n'),
						},
					]
				: []),
			{ type: 'text', text },
		]
		await preloadLibrary()
		updateThread(key, (thread) => {
			if (thread.transcript.length) return {}
			const opening = openingLine(
				learnerName,
				ctx.lang,
				activeIds(deckStatusByPhrase(ctx.lang)).length
			)
			return {
				transcript: [
					{ role: 'user', content: [{ type: 'text', text: KICKOFF_TEXT }] },
					{ role: 'assistant', content: [{ type: 'text', text: opening }] },
				],
				log: [entry('coach', opening)],
			}
		})
		updateThread(key, (thread) => ({
			transcript: appendUserBlocks(thread.transcript, blocks),
			log: [...thread.log, entry('learner', text)],
			suggestions: [],
			pageNotes: [],
		}))

		const afterTurn: Array<() => void> = []
		for (let step = 0; step < MAX_STEPS; step++) {
			// oxlint-disable-next-line no-await-in-loop -- each step sends the previous step's tool results
			const response = await coachStep({
				lang: ctx.lang,
				translationLang: ctx.translationLang,
				learnerName,
				messages: compactTranscript(getThread(key).transcript),
			})
			if (!response.content.length) break

			const said = response.content.flatMap((b) =>
				b.type === 'text' && b.text.trim()
					? [entry('coach', b.text.trim())]
					: []
			)
			updateThread(key, (thread) => ({
				transcript: [
					...thread.transcript,
					{ role: 'assistant', content: response.content },
				],
				log: [...thread.log, ...said],
			}))

			const calls = response.content.filter(
				(b): b is ToolUseBlock => b.type === 'tool_use'
			)
			if (!calls.length) break

			const results: Array<ToolResultBlock> = []
			for (const toolCall of calls) {
				// oxlint-disable-next-line no-await-in-loop -- tools run in the order the model called them: show_on_page after the search it shows
				const outcome = await runTool(toolCall.name, toolCall.input, ctx)
				if (outcome.after) afterTurn.push(outcome.after)
				const content =
					typeof outcome.result === 'string'
						? outcome.result
						: JSON.stringify(outcome.result)
				results.push({
					type: 'tool_result',
					tool_use_id: toolCall.id,
					content: content.slice(0, MAX_RESULT_CHARS),
					...(outcome.isError ? { is_error: true } : {}),
				})
			}
			updateThread(key, (thread) => ({
				transcript: appendUserBlocks(thread.transcript, results),
			}))
		}
		afterTurn.forEach((fn) => fn())
	} catch (err) {
		console.error('coach turn failed', err)
		const message =
			err instanceof Error ? err.message : "The coach couldn't answer."
		updateThread(key, (thread) => ({
			log: [...thread.log, entry('error', message)],
		}))
	} finally {
		useCoachBusyStore.setState({ [key]: false })
	}
}

// Something the learner did on the page. It shows in the chat log now and
// reaches the coach with the learner's next message.
export function notePageAction(key: string, note: string) {
	updateThread(key, (thread) => ({
		log: [...thread.log, entry('action', note)],
		pageNotes: [...thread.pageNotes, note],
	}))
}
