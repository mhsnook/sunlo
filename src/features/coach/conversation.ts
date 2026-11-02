import type { FlueConversationMessage, FlueConversationPart } from '@flue/react'
import * as v from 'valibot'
import languages from '@/lib/languages'
import {
	CONTEXT_PREFIX,
	formatCoachContext,
	parseCoachContext,
	type CoachContext,
	AddToDeckOutputSchema,
	DECK_TARGET,
	DraftRequestOutputSchema,
	NavigateOutputSchema,
	ShowOnPageOutputSchema,
	SuggestRepliesOutputSchema,
	type NavigateTarget,
	type ShowOnPageOutput,
} from './protocol'

// The coach page renders from the agent's conversation. This module turns
// Flue's messages into what the page shows, and builds what the page sends.

export type CoachLogEntry = {
	id: string
	kind: 'learner' | 'coach' | 'action' | 'error'
	text: string
}

export type CoachView = {
	id: string
	lang: string
	title: string
	subtitle: string | null
	phraseIds: Array<string>
	requestIds: Array<string>
	playlistIds: Array<string>
	// A request the coach drafted for the learner to edit and post.
	draftRequest: string | null
}

// Lines the page adds to a learner's message. The learner sees `[Page:`
// lines as notes; `[Deck:` and `[Context:` lines are for the coach only.
const PAGE_PREFIX = '[Page: '
const DECK_PREFIX = '[Deck: '
// The fixed greeting the page showed before the first message, so the
// coach knows what it already said.
const OPENING_PREFIX = '[Page: you opened with: '

const isPageLine = (line: string) =>
	line.startsWith(PAGE_PREFIX) ||
	line.startsWith(DECK_PREFIX) ||
	line.startsWith(CONTEXT_PREFIX)

type ToolPart = Extract<FlueConversationPart, { type: 'dynamic-tool' }>

const toolParts = (message: FlueConversationMessage) =>
	message.parts.filter((part): part is ToolPart => part.type === 'dynamic-tool')

function finished<S extends v.GenericSchema>(
	part: ToolPart,
	name: string,
	schema: S
): v.InferOutput<S> | null {
	if (part.toolName !== name || part.state !== 'output-available') return null
	const parsed = v.safeParse(schema, part.output)
	return parsed.success ? parsed.output : null
}

const viewFrom = (id: string, output: ShowOnPageOutput): CoachView => ({
	id,
	lang: output.lang,
	title: output.title,
	subtitle: output.subtitle,
	phraseIds: output.phrase_ids,
	requestIds: output.request_ids,
	playlistIds: output.playlist_ids,
	draftRequest: null,
})

function describeView(view: CoachView) {
	if (view.draftRequest !== null) return 'Drafted a request'
	const parts = [
		view.phraseIds.length && `${view.phraseIds.length} phrases`,
		view.requestIds.length && `${view.requestIds.length} requests`,
		view.playlistIds.length && `${view.playlistIds.length} sets`,
	].filter(Boolean)
	return `Showing “${view.title}” · ${parts.join(', ') || 'empty'}`
}

// One conversation spans every language the learner studies; `lang` is the
// page's. Sets and suggestions from another language stay off this page.
export function readConversation(
	messages: Array<FlueConversationMessage>,
	lang: string
) {
	const log: Array<CoachLogEntry> = []
	const views: Array<CoachView> = []
	let turnLang: string | null = null
	for (const message of messages) {
		if (message.settlement)
			log.push({
				id: message.id,
				kind: 'error',
				text: "The coach couldn't finish that. Try again.",
			})
		if (message.display !== 'visible') continue
		message.parts.forEach((part, i) => {
			const id = `${message.id}:${i}`
			if (part.type === 'text' && message.role === 'user') {
				turnLang = parseCoachContext(part.text)?.lang ?? turnLang
				const lines = part.text.split('\n')
				lines.forEach((line, k) => {
					const opening = line.startsWith(OPENING_PREFIX)
					if (opening || line.startsWith(PAGE_PREFIX))
						log.push({
							id: `${id}:${k}`,
							kind: opening ? 'coach' : 'action',
							text: line.slice(
								(opening ? OPENING_PREFIX : PAGE_PREFIX).length,
								-1
							),
						})
				})
				const said = lines
					.filter((line) => !isPageLine(line))
					.join('\n')
					.trim()
				if (said) log.push({ id, kind: 'learner', text: said })
			} else if (part.type === 'text' && message.role === 'assistant') {
				if (part.text.trim())
					log.push({ id, kind: 'coach', text: part.text.trim() })
			} else if (part.type === 'dynamic-tool') {
				const view = viewOf(part)
				if (!view) return
				if (view.lang === lang) {
					views.push(view)
					log.push({ id, kind: 'action', text: describeView(view) })
				} else {
					const page = languages[view.lang] ?? view.lang
					log.push({
						id,
						kind: 'action',
						text: `${describeView(view)} on your ${page} page`,
					})
				}
			}
		})
	}

	const last = messages.at(-1)
	const suggestions =
		last?.role === 'assistant' && turnLang === lang
			? (toolParts(last)
					.map((part) =>
						finished(part, 'suggest_replies', SuggestRepliesOutputSchema)
					)
					.findLast(Boolean)?.replies ?? [])
			: []

	return { log, views, suggestions }
}

function viewOf(part: ToolPart): CoachView | null {
	const shown = finished(part, 'show_on_page', ShowOnPageOutputSchema)
	if (shown) return viewFrom(part.toolCallId, shown)
	const draft = finished(part, 'draft_request', DraftRequestOutputSchema)
	if (draft)
		return {
			id: part.toolCallId,
			lang: draft.lang,
			title: 'A new request',
			subtitle: 'Your coach drafted this. Change anything, then post it.',
			phraseIds: [],
			requestIds: [],
			playlistIds: [],
			draftRequest: draft.prompt,
		}
	return null
}

// What one submission asked the page to do: the deck writes and the
// navigation, which run in the learner's own session, and the phrases it
// showed, so the page can tell the coach which were already in the deck.
export function pageActions(
	messages: Array<FlueConversationMessage>,
	submissionId: string
) {
	const parts = messages
		.filter((message) => message.submissionId === submissionId)
		.flatMap(toolParts)
	return {
		add: parts.flatMap(
			(part) =>
				finished(part, 'add_to_deck', AddToDeckOutputSchema)?.phrase_ids ?? []
		),
		shown: parts.flatMap(
			(part) =>
				finished(part, 'show_on_page', ShowOnPageOutputSchema)?.phrase_ids ?? []
		),
		navigate: parts
			.map((part) => finished(part, 'navigate', NavigateOutputSchema))
			.findLast((target): target is NavigateTarget => !!target),
	}
}

export function composeMessage(
	text: string,
	page: {
		context: CoachContext
		notes: Array<string>
		deck: string
		opening: string | null
	}
) {
	return [
		formatCoachContext(page.context),
		...(page.opening ? [`${OPENING_PREFIX}${page.opening}]`] : []),
		...page.notes.map((note) => `${PAGE_PREFIX}${note}]`),
		`${DECK_PREFIX}${page.deck}]`,
		text,
	].join('\n')
}

export const OPENING_REPLIES = ['Family', 'A partner', 'Moving there', 'Travel']

// Fixed, so the page shows it before the first model call. The first message
// carries it to the coach (OPENING_PREFIX).
export function openingLine(
	learnerName: string | null,
	lang: string,
	deckSize: number
) {
	const name = languages[lang] ?? lang
	const hello = learnerName ? `Hi ${learnerName}.` : 'Hi.'
	const deck = deckSize
		? `You have ${deckSize} phrases in your ${name} deck.`
		: `Let's build your ${name} deck together.`
	return `${hello} ${deck} What brings you to ${name}?`
}

export function deckLine(deck: {
	size: number
	tags: Array<{ name: string; count: number }>
}) {
	const tags = deck.tags.map((t) => `${t.name} (${t.count})`).join(', ')
	return `${deck.size} of ${DECK_TARGET} phrases${tags ? `; most tagged ${tags}` : ''}`
}
