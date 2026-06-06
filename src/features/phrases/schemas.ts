import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'
import { PhraseTagSchema } from '@/features/languages/schemas'
import type { PublicProfileType } from '@/features/profile/schemas'
import type { PhraseRequestType } from '@/features/requests/schemas'

export const FilterEnumSchema = z.enum([
	'language_filtered',
	'active',
	'inactive',
	'reviewed_last_7d',
	'not_in_deck',
	'language_no_translations',
	'language',
])

export const SmartSearchSortBySchema = z.enum(['relevance', 'popularity'])

export const PhraseSearchSchema = z.object({
	text: z.string().optional(),
	filter: FilterEnumSchema.optional(),
	tags: z.string().optional(),
	sort: SmartSearchSortBySchema.optional(),
})

export const TranslationSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	text: z.string(),
	lang: LangSchema,
	phrase_id: z.string().uuid(),
	added_by: z.string().uuid().nullable(),
	archived: z.boolean().default(false),
	updated_at: z.string().nullable().default(null),
})

export type TranslationType = z.infer<typeof TranslationSchema>

// PhraseSchema — the row shape held by `phrasesCollection`. Tracks the
// `phrase` table directly (minus translations, tags, and stats which are
// composed on by the live queries in `live.ts` or — for stats today —
// still ride from the `phrase_meta` view).
export const PhraseSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	text: z.string(),
	lang: LangSchema,
	added_by: z.string().uuid().nullable(),
	only_reverse: z.boolean().default(false),
	archived: z.boolean().default(false),
	avg_difficulty: z.number().nullable().default(null),
	avg_stability: z.number().nullable().default(null),
	count_learners: z.number().nullable().default(0),
})

export type PhraseType = z.infer<typeof PhraseSchema>

// PhraseTagLinkSchema — the row shape of `phrase_tag`, the join table
// between phrase and tag. Composite primary key (phrase_id, tag_id).
export const PhraseTagLinkSchema = z.object({
	phrase_id: z.string().uuid(),
	tag_id: z.string().uuid(),
	created_at: z.string(),
	added_by: z.string().uuid(),
})

export type PhraseTagLinkType = z.infer<typeof PhraseTagLinkSchema>

// PhraseFullType — derived shape produced by `phrasesComposed` /
// `phrasesFull` live queries. `translations` is aggregated from
// `phraseTranslationsCollection` via toArray() at query time; `tags` is
// aggregated from `phraseTagLinksCollection` joined with langTags.
export type PhraseFullType = PhraseType & {
	translations: Array<TranslationType>
	tags: Array<{ id: string; name: string }>
}

// Parser for places (RPC responses, write paths) that need to validate a
// composed phrase+translations payload.
export const PhraseFullSchema = PhraseSchema.extend({
	translations: z.preprocess((val) => val ?? [], z.array(TranslationSchema)),
	tags: z.preprocess((val) => val ?? [], z.array(PhraseTagSchema)),
})

export type PhraseFullFullType = PhraseFullType & {
	profile: PublicProfileType
	request?: PhraseRequestType
	searchableText: string
}

export type PhraseFullFilteredType = PhraseFullFullType & {
	translations_mine: Array<TranslationType>
	translations_other: Array<TranslationType>
}
