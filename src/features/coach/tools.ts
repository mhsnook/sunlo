import { addPhrasesToDeck } from '@/features/deck/mutations'
import { runSemanticSearch } from '@/hooks/use-semantic-search'
import languages from '@/lib/languages'
import {
	activeIds,
	answerPhraseIds,
	countTags,
	deckStatusByPhrase,
	keywordRank,
	langPhrases,
	langPlaylists,
	langRequests,
	phraseById,
	playlistById,
	playlistPhraseIds,
	requestById,
	translationFor,
	type DeckStatus,
	type LibraryPhrase,
} from './library'
import {
	coachTools,
	DECK_TARGET,
	isCoachToolName,
	type CoachToolInput,
	type CoachToolName,
} from './protocol'
import { logId, pushView, updateThread } from './store'

export type NavTarget = CoachToolInput<'navigate'>

export type ToolContext = {
	key: string
	lang: string
	translationLang: string
	uid: string
	navigate: (target: NavTarget) => void
}

export type ToolOutcome = {
	result: unknown
	isError?: boolean
	// Runs after the turn ends, so a navigation never cuts off the reply.
	after?: () => void
}

const DEFAULT_LIMIT = 16

function phraseSummary(
	phrase: LibraryPhrase,
	ctx: ToolContext,
	statuses: Map<string, DeckStatus>
) {
	return {
		id: phrase.id,
		text: phrase.text,
		translation: translationFor(phrase, ctx.translationLang),
		tags: phrase.tags.map((t) => t.name),
		learners: phrase.count_learners ?? 0,
		deck: statuses.get(phrase.id) ?? null,
	}
}

function logAction(key: string, text: string) {
	updateThread(key, (thread) => ({
		log: [...thread.log, { id: logId(), kind: 'action', text }],
	}))
}

function semanticIds(
	results: Awaited<ReturnType<typeof runSemanticSearch>>,
	type: 'phrase' | 'request' | 'playlist'
) {
	return results.filter((r) => r.entity_type === type).map((r) => r.entity_id)
}

type Hits = {
	method: 'meaning' | 'keywords' | 'tags'
	phrases: Array<LibraryPhrase>
	requestIds: Array<string>
	playlistIds: Array<string>
}

async function semanticHits(
	query: string,
	all: Array<LibraryPhrase>,
	lang: string
): Promise<Hits | null> {
	const semantic = await runSemanticSearch(
		[lang],
		{ kind: 'text', text: query },
		{ limit: 40 }
	).catch((err: unknown) => {
		console.warn('coach: semantic search failed, using keywords', err)
		return []
	})
	if (!semantic.length) return null
	const byId = new Map(all.map((p) => [p.id, p]))
	return {
		method: 'meaning',
		phrases: semanticIds(semantic, 'phrase')
			.map((id) => byId.get(id))
			.filter((p): p is LibraryPhrase => !!p),
		requestIds: semanticIds(semantic, 'request'),
		playlistIds: semanticIds(semantic, 'playlist'),
	}
}

function keywordHits(
	query: string,
	all: Array<LibraryPhrase>,
	lang: string
): Hits {
	return {
		method: 'keywords',
		phrases: keywordRank(all, query, (p) => p.searchableText),
		requestIds: keywordRank(langRequests(lang), query, (r) => r.prompt).map(
			(r) => r.id
		),
		playlistIds: keywordRank(
			langPlaylists(lang),
			query,
			(p) => `${p.title} ${p.description ?? ''}`
		).map((p) => p.id),
	}
}

async function searchLibrary(
	input: CoachToolInput<'search_library'>,
	ctx: ToolContext
) {
	const statuses = deckStatusByPhrase(ctx.lang)
	const tagSet = input.tags?.length
		? new Set(input.tags.map((t) => t.toLowerCase()))
		: null
	const keep = (p: LibraryPhrase) =>
		(!tagSet || p.tags.some((t) => tagSet.has(t.name.toLowerCase()))) &&
		(!input.not_in_deck || statuses.get(p.id) !== 'active')

	const all = langPhrases(ctx.lang)
	const query = input.query?.trim()
	const hits: Hits = query
		? ((await semanticHits(query, all, ctx.lang)) ??
			keywordHits(query, all, ctx.lang))
		: {
				method: 'tags',
				phrases: all.toSorted(
					(a, b) => (b.count_learners ?? 0) - (a.count_learners ?? 0)
				),
				requestIds: [],
				playlistIds: [],
			}

	return {
		method: hits.method,
		phrases: hits.phrases
			.filter(keep)
			.slice(0, input.limit ?? DEFAULT_LIMIT)
			.map((p) => phraseSummary(p, ctx, statuses)),
		requests: hits.requestIds.slice(0, 6).flatMap((id) => {
			const request = requestById(id)
			if (!request) return []
			return [
				{ id, prompt: request.prompt, answer_phrase_ids: answerPhraseIds(id) },
			]
		}),
		playlists: hits.playlistIds.slice(0, 6).flatMap((id) => {
			const playlist = playlistById(id)
			if (!playlist) return []
			return [
				{
					id,
					title: playlist.title,
					description: playlist.description,
					phrase_ids: playlistPhraseIds(id),
				},
			]
		}),
	}
}

async function findSimilar(
	input: CoachToolInput<'find_similar'>,
	ctx: ToolContext
) {
	const limit = input.limit ?? DEFAULT_LIMIT
	const statuses = deckStatusByPhrase(ctx.lang)
	const anchors = new Set(input.phrase_ids)
	const all = langPhrases(ctx.lang).filter(
		(p) =>
			!anchors.has(p.id) &&
			(!input.not_in_deck || statuses.get(p.id) !== 'active')
	)
	const byId = new Map(all.map((p) => [p.id, p]))

	const semantic = await runSemanticSearch(
		[ctx.lang],
		{ kind: 'anchor', ids: input.phrase_ids },
		{ excludeIds: input.phrase_ids, limit: 40 }
	).catch((err: unknown) => {
		console.warn('coach: look-alike search failed, using tags', err)
		return []
	})
	let similar = semanticIds(semantic, 'phrase')
		.map((id) => byId.get(id))
		.filter((p): p is LibraryPhrase => !!p)

	if (!similar.length) {
		const anchorTags = new Set(
			input.phrase_ids.flatMap(
				(id) => phraseById(id)?.tags.map((t) => t.name) ?? []
			)
		)
		similar = all
			.map((p) => ({
				p,
				shared: p.tags.filter((t) => anchorTags.has(t.name)).length,
			}))
			.filter((row) => row.shared > 0)
			.toSorted((a, b) => b.shared - a.shared)
			.map((row) => row.p)
	}
	return {
		phrases: similar
			.slice(0, limit)
			.map((p) => phraseSummary(p, ctx, statuses)),
	}
}

function listTags(ctx: ToolContext) {
	const phrases = langPhrases(ctx.lang)
	return { phrase_count: phrases.length, tags: countTags(phrases) }
}

function getDeck(ctx: ToolContext) {
	const statuses = deckStatusByPhrase(ctx.lang)
	const phrases = activeIds(statuses)
		.map(phraseById)
		.filter((p): p is LibraryPhrase => !!p)
	return {
		language: languages[ctx.lang] ?? ctx.lang,
		active_phrases: phrases.length,
		target: DECK_TARGET,
		tags: countTags(phrases).slice(0, 12),
		recent: phrases
			.toReversed()
			.slice(0, 12)
			.map((p) => phraseSummary(p, ctx, statuses)),
	}
}

function partition(ids: Array<string>, exists: (id: string) => unknown) {
	const known: Array<string> = []
	const unknown: Array<string> = []
	for (const id of ids) (exists(id) ? known : unknown).push(id)
	return { known, unknown }
}

function showOnPage(input: CoachToolInput<'show_on_page'>, ctx: ToolContext) {
	const phrases = partition(input.phrase_ids, phraseById)
	const requests = partition(input.request_ids ?? [], requestById)
	const playlists = partition(input.playlist_ids ?? [], playlistById)
	pushView(ctx.key, {
		title: input.title,
		subtitle: input.subtitle ?? null,
		phraseIds: phrases.known,
		requestIds: requests.known,
		playlistIds: playlists.known,
	})
	const parts = [
		phrases.known.length && `${phrases.known.length} phrases`,
		requests.known.length && `${requests.known.length} requests`,
		playlists.known.length && `${playlists.known.length} sets`,
	].filter(Boolean)
	logAction(
		ctx.key,
		`Showing “${input.title}” · ${parts.join(', ') || 'empty'}`
	)
	const unknown = [
		...phrases.unknown,
		...requests.unknown,
		...playlists.unknown,
	]
	return {
		shown: {
			phrases: phrases.known.length,
			requests: requests.known.length,
			playlists: playlists.known.length,
		},
		...(unknown.length ? { unknown_ids: unknown } : {}),
	}
}

async function addToDeck(
	input: CoachToolInput<'add_to_deck'>,
	ctx: ToolContext
) {
	const statuses = deckStatusByPhrase(ctx.lang)
	const phrases = input.phrase_ids
		.map(phraseById)
		.filter((p): p is LibraryPhrase => !!p && p.lang === ctx.lang)
	const fresh = phrases.filter((p) => {
		const status = statuses.get(p.id)
		return status !== 'active' && status !== 'learned'
	})
	if (fresh.length)
		await addPhrasesToDeck(
			ctx.lang,
			ctx.uid,
			fresh.map((p) => ({ id: p.id, only_reverse: p.only_reverse }))
		)
	const deckSize = activeIds(statuses).length + fresh.length
	if (fresh.length) {
		const what =
			fresh.length === 1 ? `“${fresh[0].text}”` : `${fresh.length} phrases`
		logAction(ctx.key, `Added ${what} · deck at ${deckSize} of ${DECK_TARGET}`)
	}
	return {
		added: fresh.length,
		already_in_deck: phrases.length - fresh.length,
		not_found: input.phrase_ids.length - phrases.length,
		deck_size: deckSize,
		target: DECK_TARGET,
	}
}

function suggestReplies(
	input: CoachToolInput<'suggest_replies'>,
	ctx: ToolContext
) {
	updateThread(ctx.key, () => ({ suggestions: input.replies }))
	return { ok: true }
}

function navigateTo(
	input: CoachToolInput<'navigate'>,
	ctx: ToolContext
): ToolOutcome {
	const needsId = ['phrase', 'playlist', 'request'].includes(input.to)
	if (needsId && !input.id)
		return { result: `"${input.to}" needs an id`, isError: true }
	return { result: { ok: true }, after: () => ctx.navigate(input) }
}

type Handler<N extends CoachToolName> = (
	input: CoachToolInput<N>,
	ctx: ToolContext
) => ToolOutcome | Promise<ToolOutcome>

const handlers: { [N in CoachToolName]: Handler<N> } = {
	search_library: async (input, ctx) => ({
		result: await searchLibrary(input, ctx),
	}),
	find_similar: async (input, ctx) => ({
		result: await findSimilar(input, ctx),
	}),
	list_tags: (_input, ctx) => ({ result: listTags(ctx) }),
	get_deck: (_input, ctx) => ({ result: getDeck(ctx) }),
	show_on_page: (input, ctx) => ({ result: showOnPage(input, ctx) }),
	add_to_deck: async (input, ctx) => ({ result: await addToDeck(input, ctx) }),
	suggest_replies: (input, ctx) => ({ result: suggestReplies(input, ctx) }),
	navigate: navigateTo,
}

export async function runTool(
	name: string,
	input: unknown,
	ctx: ToolContext
): Promise<ToolOutcome> {
	if (!isCoachToolName(name))
		return { result: `No tool named ${name}`, isError: true }
	const parsed = coachTools[name].input.safeParse(input)
	if (!parsed.success)
		return { result: `Bad input: ${parsed.error.message}`, isError: true }
	// Sound: `parsed` came from the schema for this same `name`.
	const handler = handlers[name] as Handler<CoachToolName>
	try {
		return await handler(parsed.data as never, ctx)
	} catch (err) {
		console.error(`coach tool ${name} failed`, err)
		return {
			result: err instanceof Error ? err.message : 'The tool failed',
			isError: true,
		}
	}
}
