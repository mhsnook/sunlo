import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'
import { PhraseTagSchema } from '@/features/languages/schemas'
import type { PublicProfileType } from '@/features/profile/schemas'
import type { CardMetaType } from '@/features/deck/schemas'
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

export type FilterEnumType = z.infer<typeof FilterEnumSchema>

export const SmartSearchSortBySchema = z.enum(['relevance', 'popularity'])
export type SmartSearchSortByType = z.infer<typeof SmartSearchSortBySchema>

export const PhraseSearchSchema = z.object({
	text: z.string().optional(),
	filter: FilterEnumSchema.optional(),
	tags: z.string().optional(),
	sort: SmartSearchSortBySchema.optional(),
})

export type PhraseSearchType = z.infer<typeof PhraseSearchSchema>

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

export const PhraseFullSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	text: z.string(),
	lang: LangSchema,
	added_by: z.string().uuid().nullable(),
	only_reverse: z.boolean().default(false),
	avg_difficulty: z.number().nullable().default(null),
	avg_stability: z.number().nullable().default(null),
	count_learners: z.number().nullable().default(0),
	tags: z.preprocess((val) => val ?? [], z.array(PhraseTagSchema)),
	translations: z.preprocess((val) => val ?? [], z.array(TranslationSchema)),
})

export type PhraseFullType = z.infer<typeof PhraseFullSchema>

// Type returned by splitPhraseTranslations - PhraseFullType with split translations
export type PhraseWithTranslationSplit = PhraseFullType & {
	translations_mine: Array<TranslationType>
	translations_other: Array<TranslationType>
}

export type PhraseFullFullType = PhraseFullType & {
	profile: PublicProfileType
	card?: CardMetaType
	request?: PhraseRequestType
	searchableText: string
}

export type PhraseFullFilteredType = PhraseFullFullType & {
	translations_mine: Array<TranslationType>
	translations_other: Array<TranslationType>
}
