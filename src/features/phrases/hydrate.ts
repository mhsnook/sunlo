import {
	phrasesCollection,
	phraseTagLinksCollection,
	phraseTranslationsCollection,
} from './collections'
import { PhraseSchema, PhraseTagLinkSchema, TranslationSchema } from './schemas'
import supabase from '@/lib/supabase-client'

// SPIKE building block (not yet wired — see header note below).
//
// The "land a language slice with one request" primitive. Postgres does the
// join via PostgREST resource embedding; we split the nested result into the
// three normalized collections, so the existing `phrasesComposed` / `phrasesFull`
// live queries re-derive their shapes with no change. Refinement (search, a
// created_at window, a tag filter) then happens in-memory off the resident slice.
//
// Embedding is done from the base `phrase` table, not the `phrase_meta` view:
// the FKs (`phrase_translation.phrase_id`, `phrase_tag.phrase_id`) reference
// `phrase.id`, and embedding through the aggregate view is unreliable. The cost
// is that the view's computed columns (count_learners, avg_difficulty,
// avg_stability) come back absent and PhraseSchema fills them with its
// nullable/0 defaults — fine for the learn surface, not for stats views. If
// real stats are needed in one request, the clean answer is a
// `get_phrases_full(lang)` RPC returning json_build_object(...) — but that's a
// migration, so it belongs on a next-<version> branch, not here.
//
// NOT WIRED until two prerequisites land, both of which currently depend on the
// whole `phrase` table being resident:
//   1. browse.index.tsx phrase-counts → a server-side aggregate (it groups the
//      whole table by lang today).
//   2. use-local-search.ts langs=null path → lean on the server-backed hybrid
//      search (this local pass becomes per-loaded-language).
// Only then can the three collections drop their whole-table queryFns and let
// this be the sole loader, driven by the $lang route param.
export async function hydratePhrasesForLang(lang: string): Promise<void> {
	const { data } = await supabase
		.from('phrase')
		.select('*, phrase_translation(*), phrase_tag(*)')
		.eq('lang', lang)
		.throwOnError()

	phrasesCollection.utils.writeBatch(() => {
		for (const row of data ?? []) {
			const { phrase_translation, phrase_tag, ...phrase } = row
			phrasesCollection.utils.writeUpsert(PhraseSchema.parse(phrase))
			for (const t of phrase_translation)
				phraseTranslationsCollection.utils.writeUpsert(
					TranslationSchema.parse(t)
				)
			for (const link of phrase_tag)
				phraseTagLinksCollection.utils.writeUpsert(
					PhraseTagLinkSchema.parse(link)
				)
		}
	})
}
