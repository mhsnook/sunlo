import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

// The coach's reads. Everything here is public library data, read with the
// anon key; the learner's deck stays on the page.

type Sb = SupabaseClient<Database>

const SEARCH_POOL = 40

export type PhraseHit = {
	id: string
	text: string
	translation: string | null
	tags: Array<string>
	learners: number
}

export type RequestHit = {
	id: string
	prompt: string
	answer_phrase_ids: Array<string>
}

export type PlaylistHit = {
	id: string
	title: string
	description: string | null
	phrase_ids: Array<string>
}

const unique = <T>(items: Array<T>) => [...new Set(items)]

// Phrases in the order of `ids`, with one translation and their tags.
// Archived and draft phrases drop out.
export async function phrasesById(
	sb: Sb,
	ids: Array<string>,
	translationLang: string
): Promise<Array<PhraseHit>> {
	if (!ids.length) return []
	const [phrases, translations, tags] = await Promise.all([
		sb
			.from('phrase_meta')
			.select('id, text, count_learners, archived, draft')
			.in('id', ids)
			.throwOnError(),
		sb
			.from('phrase_translation')
			.select('phrase_id, lang, text')
			.in('phrase_id', ids)
			.eq('archived', false)
			.throwOnError(),
		sb
			.from('phrase_tag')
			.select('phrase_id, tag(name)')
			.in('phrase_id', ids)
			.eq('deleted', false)
			.throwOnError(),
	])
	const byId = new Map(
		(phrases.data ?? [])
			.filter((p) => p.id && p.text && !p.archived && !p.draft)
			.map((p) => [p.id!, p])
	)
	return ids.flatMap((id) => {
		const phrase = byId.get(id)
		if (!phrase) return []
		const own = (translations.data ?? []).filter((t) => t.phrase_id === id)
		const translation =
			own.find((t) => t.lang === translationLang) ?? own[0] ?? null
		return [
			{
				id,
				text: phrase.text!,
				translation: translation?.text ?? null,
				tags: (tags.data ?? []).flatMap((t) =>
					t.phrase_id === id && t.tag ? [t.tag.name] : []
				),
				learners: phrase.count_learners ?? 0,
			},
		]
	})
}

type Hits = {
	method: 'meaning' | 'spelling' | 'tags' | 'popular'
	phraseIds: Array<string>
	requestIds: Array<string>
	playlistIds: Array<string>
}

const idsOf = (
	rows: Array<{ entity_type: string; entity_id: string }>,
	type: string
) => unique(rows.filter((r) => r.entity_type === type).map((r) => r.entity_id))

// The search Edge Function embeds the query (Workers AI) and ranks by
// meaning. It fails where it has no embedding credentials, such as a local
// Supabase, so spelling search (trigram) backs it up.
async function searchHits(sb: Sb, lang: string, query: string): Promise<Hits> {
	const semantic = await sb.functions
		.invoke<Array<{ entity_type: string; entity_id: string }>>('search', {
			body: {
				langs: [lang],
				query: { kind: 'text', text: query },
				excludeIds: [],
				limit: SEARCH_POOL,
			},
		})
		.then((r) => (r.error ? [] : (r.data ?? [])))
		.catch(() => [])
	if (semantic.length)
		return {
			method: 'meaning',
			phraseIds: idsOf(semantic, 'phrase'),
			requestIds: idsOf(semantic, 'request'),
			playlistIds: idsOf(semantic, 'playlist'),
		}
	const { data } = await sb
		.rpc('search_by_trigram', {
			query,
			target_langs: [lang],
			match_limit: SEARCH_POOL,
		})
		.throwOnError()
	const rows = data ?? []
	return {
		method: 'spelling',
		phraseIds: idsOf(rows, 'phrase'),
		requestIds: idsOf(rows, 'request'),
		playlistIds: idsOf(rows, 'playlist'),
	}
}

async function tagHits(sb: Sb, lang: string, tags: Array<string>) {
	const { data: tagRows } = await sb
		.from('tag')
		.select('id')
		.eq('lang', lang)
		.in('name', tags)
		.throwOnError()
	const tagIds = (tagRows ?? []).map((t) => t.id)
	if (!tagIds.length) return []
	const { data } = await sb
		.from('phrase_tag')
		.select('phrase_id')
		.in('tag_id', tagIds)
		.eq('deleted', false)
		.limit(SEARCH_POOL)
		.throwOnError()
	return unique((data ?? []).map((row) => row.phrase_id))
}

async function popularIds(sb: Sb, lang: string) {
	const { data } = await sb
		.from('phrase_meta')
		.select('id')
		.eq('lang', lang)
		.eq('archived', false)
		.eq('draft', false)
		.order('count_learners', { ascending: false })
		.limit(SEARCH_POOL)
		.throwOnError()
	return (data ?? []).flatMap((row) => (row.id ? [row.id] : []))
}

export async function requestsById(
	sb: Sb,
	ids: Array<string>
): Promise<Array<RequestHit>> {
	if (!ids.length) return []
	const [requests, links] = await Promise.all([
		sb
			.from('phrase_request')
			.select('id, prompt')
			.in('id', ids)
			.eq('deleted', false)
			.throwOnError(),
		sb
			.from('comment_phrase_link')
			.select('request_id, phrase_id')
			.in('request_id', ids)
			.eq('deleted', false)
			.throwOnError(),
	])
	return (requests.data ?? []).map((r) => ({
		id: r.id,
		prompt: r.prompt,
		answer_phrase_ids: unique(
			(links.data ?? [])
				.filter((l) => l.request_id === r.id)
				.map((l) => l.phrase_id)
		),
	}))
}

export async function playlistsById(
	sb: Sb,
	ids: Array<string>
): Promise<Array<PlaylistHit>> {
	if (!ids.length) return []
	const [playlists, links] = await Promise.all([
		sb
			.from('phrase_playlist')
			.select('id, title, description')
			.in('id', ids)
			.eq('deleted', false)
			.throwOnError(),
		sb
			.from('playlist_phrase_link')
			.select('playlist_id, phrase_id, order')
			.in('playlist_id', ids)
			.eq('deleted', false)
			.throwOnError(),
	])
	return (playlists.data ?? []).map((p) => ({
		id: p.id,
		title: p.title,
		description: p.description,
		phrase_ids: (links.data ?? [])
			.filter((l) => l.playlist_id === p.id)
			.toSorted((a, b) => (a.order ?? 0) - (b.order ?? 0))
			.map((l) => l.phrase_id),
	}))
}

export async function searchLibrary(
	sb: Sb,
	input: { lang: string; translationLang: string },
	search: { query?: string; tags?: Array<string>; limit?: number }
) {
	const query = search.query?.trim()
	const hits: Hits = query
		? await searchHits(sb, input.lang, query)
		: search.tags?.length
			? {
					method: 'tags',
					phraseIds: await tagHits(sb, input.lang, search.tags),
					requestIds: [],
					playlistIds: [],
				}
			: {
					method: 'popular',
					phraseIds: await popularIds(sb, input.lang),
					requestIds: [],
					playlistIds: [],
				}
	const limit = search.limit ?? 16
	const [phrases, requests, playlists] = await Promise.all([
		phrasesById(sb, hits.phraseIds, input.translationLang),
		requestsById(sb, hits.requestIds.slice(0, 6)),
		playlistsById(sb, hits.playlistIds.slice(0, 6)),
	])
	const tagSet = query && search.tags?.length ? new Set(search.tags) : null
	return {
		method: hits.method,
		phrases: (tagSet
			? phrases.filter((p) => p.tags.some((t) => tagSet.has(t)))
			: phrases
		).slice(0, limit),
		requests,
		playlists,
	}
}

// Look-alikes by meaning when the search Edge Function can embed, else by
// shared tags.
export async function findSimilar(
	sb: Sb,
	input: { lang: string; translationLang: string },
	anchors: Array<string>,
	limit = 16
) {
	const semantic = await sb.functions
		.invoke<Array<{ entity_type: string; entity_id: string }>>('search', {
			body: {
				langs: [input.lang],
				query: { kind: 'anchor', ids: anchors },
				excludeIds: anchors,
				limit: SEARCH_POOL,
			},
		})
		.then((r) => (r.error ? [] : (r.data ?? [])))
		.catch(() => [])
	let ids = idsOf(semantic, 'phrase')
	if (!ids.length) {
		const { data } = await sb
			.from('phrase_tag')
			.select('tag_id')
			.in('phrase_id', anchors)
			.eq('deleted', false)
			.throwOnError()
		const tagIds = unique((data ?? []).map((row) => row.tag_id))
		if (tagIds.length) {
			const { data: linked } = await sb
				.from('phrase_tag')
				.select('phrase_id')
				.in('tag_id', tagIds)
				.eq('deleted', false)
				.limit(SEARCH_POOL)
				.throwOnError()
			ids = unique((linked ?? []).map((row) => row.phrase_id))
		}
	}
	const anchorSet = new Set(anchors)
	return {
		phrases: await phrasesById(
			sb,
			ids.filter((id) => !anchorSet.has(id)).slice(0, limit),
			input.translationLang
		),
	}
}

export async function listTags(sb: Sb, lang: string) {
	const { data } = await sb
		.from('tag')
		.select('name, phrase_tag(count)')
		.eq('lang', lang)
		.throwOnError()
	return (data ?? [])
		.map((tag) => ({
			name: tag.name,
			count:
				(tag.phrase_tag as unknown as Array<{ count: number }>)[0]?.count ?? 0,
		}))
		.filter((tag) => tag.count > 0)
		.toSorted((a, b) => b.count - a.count)
}
