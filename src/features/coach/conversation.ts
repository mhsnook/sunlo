import type { FlueConversationMessage, FlueConversationPart } from '@flue/react'
import * as v from 'valibot'
import languages from '@/lib/languages'
import {
	AddToDeckOutputSchema,
	DECK_TARGET,
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
	title: string
	subtitle: string | null
	phraseIds: Array<string>
	requestIds: Array<string>
	playlistIds: Array<string>
}

// Lines the page adds to a learner's message. The learner sees `[Page:`
// lines as notes; `[Deck:` lines are for the coach only.
const PAGE_PREFIX = '[Page: '
const DECK_PREFIX = '[Deck: '
// The fixed greeting the page showed before the first message, so the
// coach knows what it already said.
const OPENING_PREFIX = '[Page: you opened with: '

const isPageLine = (line: string) =>
	line.startsWith(PAGE_PREFIX) || line.startsWith(DECK_PREFIX)

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
	title: output.title,
	subtitle: output.subtitle,
	phraseIds: output.phrase_ids,
	requestIds: output.request_ids,
	playlistIds: output.playlist_ids,
})

function describeView(view: CoachView) {
	const parts = [
		view.phraseIds.length && `${view.phraseIds.length} phrases`,
		view.requestIds.length && `${view.requestIds.length} requests`,
		view.playlistIds.length && `${view.playlistIds.length} sets`,
	].filter(Boolean)
	return `Showing “${view.title}” · ${parts.join(', ') || 'empty'}`
}

export function readConversation(messages: Array<FlueConversationMessage>) {
	const log: Array<CoachLogEntry> = []
	const views: Array<CoachView> = []
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
				const shown = finished(part, 'show_on_page', ShowOnPageOutputSchema)
				if (shown) {
					const view = viewFrom(part.toolCallId, shown)
					views.push(view)
					log.push({ id, kind: 'action', text: describeView(view) })
				}
			}
		})
	}

	const last = messages.at(-1)
	const suggestions =
		last?.role === 'assistant'
			? (toolParts(last)
					.map((part) =>
						finished(part, 'suggest_replies', SuggestRepliesOutputSchema)
					)
					.findLast(Boolean)?.replies ?? [])
			: []

	return { log, views, suggestions }
}

// What one submission asked the page to do: the deck writes and the
// navigation, which run in the learner's own session.
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
		navigate: parts
			.map((part) => finished(part, 'navigate', NavigateOutputSchema))
			.findLast((target): target is NavigateTarget => !!target),
	}
}

export function composeMessage(
	text: string,
	page: { notes: Array<string>; deck: string; opening: string | null }
) {
	return [
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
