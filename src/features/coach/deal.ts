import { create } from 'zustand'
import { addPhrasesToDeck } from '@/features/deck/mutations'
import { activeIds, deckStatuses, type DeckStatus } from './library'
import { settleNote, startNote } from './store'

export type DealtPhrase = {
	id: string
	text: string
	only_reverse: boolean | null
	tags: Array<{ name: string }>
}

/**
 * A ghost card on its way into the deck stack (or back out of it, when the
 * add fails). One ghost can carry several phrases, so a big batch stays a
 * short flurry of cards.
 */
export type Flight = {
	id: string
	pids: Array<string>
	text: string
	tag: string | null
	// The centre of the phrase tile or chat it leaves from, in viewport pixels.
	from: { x: number; y: number }
	delay: number
	out: boolean
	// Settles the dealIntoDeck call that launched it.
	settle: () => void
}

export const FLIGHT_MS = 650
const MAX_GHOSTS = 12
const noop = () => {}
const STACK_SELECTOR = '[data-testid="coach-deck-stack"]'

const useFlightStore = create<{ flights: Array<Flight> }>()(() => ({
	flights: [],
}))
export const useFlights = () => useFlightStore((state) => state.flights)

export function land(flight: Flight) {
	useFlightStore.setState((state) => ({
		flights: state.flights.filter((f) => f.id !== flight.id),
	}))
	flight.settle()
}

export function landAll() {
	for (const flight of useFlightStore.getState().flights) land(flight)
}

/**
 * Phrases that are in the deck but still in the air. The stack leaves them
 * out of its count and its pile until they land.
 */
export function inFlight(
	flights: Array<Flight>,
	statuses: Map<string, DeckStatus>
) {
	return new Set(
		flights
			.filter((flight) => !flight.out)
			.flatMap((flight) => flight.pids)
			.filter((pid) => statuses.get(pid) === 'active')
	)
}

const prefersReducedMotion = () =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onScreen(el: Element | null) {
	const rect = el?.getBoundingClientRect()
	return rect && rect.width > 0 && rect.bottom > 0 && rect.top < innerHeight
		? rect
		: null
}

// From the phrase's tile if the learner can see it, else from the chat.
function sourcePoint(pid: string) {
	const tile = onScreen(
		document.querySelector(
			`[data-testid="coach-phrase"][data-key="${CSS.escape(pid)}"]`
		)
	)
	if (tile)
		return { x: tile.left + tile.width / 2, y: tile.top + tile.height / 2 }
	const chat = onScreen(document.querySelector('[data-testid="coach-log"]'))
	if (chat) return { x: chat.left + chat.width / 2, y: chat.bottom - 40 }
	return null
}

/** Resolves when every ghost has landed, or at once if none can fly. */
function launch(phrases: Array<DealtPhrase>, out: boolean): Promise<void> {
	if (
		!phrases.length ||
		prefersReducedMotion() ||
		!document.querySelector(STACK_SELECTOR)
	)
		return Promise.resolve()
	const size = Math.ceil(phrases.length / MAX_GHOSTS)
	const groups = Array.from(
		{ length: Math.ceil(phrases.length / size) },
		(_, i) => phrases.slice(i * size, (i + 1) * size)
	)
	const step = Math.min(90, 1000 / groups.length)
	const landings: Array<Promise<void>> = []
	const flights = groups.flatMap((group, i): Array<Flight> => {
		const from = sourcePoint(group[0].id)
		if (!from) return []
		let resolve = noop
		landings.push(new Promise<void>((r) => (resolve = r)))
		return [
			{
				id: crypto.randomUUID(),
				pids: group.map((phrase) => phrase.id),
				text: group[0].text,
				tag: group[0].tags[0]?.name ?? null,
				from,
				delay: Math.round(i * step),
				out,
				settle: resolve,
			},
		]
	})
	useFlightStore.setState((state) => ({
		flights: [...state.flights, ...flights],
	}))
	return Promise.all(landings).then(() => undefined)
}

function ground(pids: Array<string>) {
	const set = new Set(pids)
	for (const flight of useFlightStore.getState().flights)
		if (!flight.out && flight.pids.some((pid) => set.has(pid))) land(flight)
}

/** What the stack counts: the deck's active phrases less those in the air. */
export const shownCount = (
	statuses: Map<string, DeckStatus>,
	flights: Array<Flight>
) => activeIds(statuses).length - inFlight(flights, statuses).size

/**
 * Adds phrases to the deck and shows them flying into the deck stack. The
 * chat note reads "adding" until the write lands and every ghost is in the
 * stack, so the note, the count and the pile change together. If the write
 * fails, the cards fly back out and the note says so; the error is rethrown
 * for the caller to report.
 */
export async function dealIntoDeck(
	pageKey: string,
	lang: string,
	uid: string,
	phrases: Array<DealtPhrase>
) {
	const what =
		phrases.length === 1 ? `“${phrases[0].text}”` : `${phrases.length} phrases`
	const noteId = startNote(pageKey, `adding ${what}…`)
	const landed = launch(phrases, false)
	try {
		await Promise.all([addPhrasesToDeck(lang, uid, phrases), landed])
	} catch (err) {
		ground(phrases.map((phrase) => phrase.id))
		void launch(phrases, true)
		settleNote(pageKey, noteId, `couldn't add ${what}`)
		throw err
	}
	settleNote(
		pageKey,
		noteId,
		`added ${what} · deck at ${shownCount(deckStatuses(lang), useFlightStore.getState().flights)}`
	)
}
