import * as z from 'zod'

export const LanguageKnownSchema = z.object({
	lang: z.string().length(3, { message: 'Please select a language' }),
	level: z.enum(['fluent', 'proficient', 'beginner']),
})

export const LanguagesKnownSchema = z
	.array(LanguageKnownSchema)
	.min(1, 'Please add at least one language you know.')

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

export const PhraseSearchSchema = z.object({
	text: z.string().optional(),
	filter: FilterEnumSchema.optional(),
	tags: z.string().optional(),
})

export type PhraseSearchType = z.infer<typeof PhraseSearchSchema>

export const PublicProfileSchema = z.object({
	uid: z.string().uuid(),
	username: z.string().default(''),
	avatar_path: z.string().default(''),
})

export const PhraseTagSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
})

export const TranslationSchema = z.object({
	id: z.string().uuid(),
	text: z.string(),
	lang: z.string().length(3),
	phrase_id: z.string().uuid(),
	added_by: z.string().uuid(),
	created_at: z.string().datetime(),
})

export const PhraseFullSchema = z.object({
	id: z.string().uuid(),
	text: z.string(),
	lang: z.string().length(3),
	added_by: z.string().uuid(),
	added_by_profile: PublicProfileSchema.optional(),
	avg_difficulty: z.number().nullable().default(null),
	avg_stability: z.number().nullable().default(null),
	count_active: z.number().nullable().default(null),
	count_cards: z.number().nullable().default(null),
	count_learned: z.number().nullable().default(null),
	count_skipped: z.number().nullable().default(null),
	created_at: z.string().datetime(),
	percent_active: z.number().nullable().default(null),
	percent_learned: z.number().nullable().default(null),
	percent_skipped: z.number().nullable().default(null),
	rank_least_difficult: z.number().nullable().default(null),
	rank_least_skipped: z.number().nullable().default(null),
	rank_most_learned: z.number().nullable().default(null),
	rank_most_stable: z.number().nullable().default(null),
	rank_newest: z.number().nullable().default(null),
	request_id: z.string().uuid().nullable().default(null),
	tags: z.array(PhraseTagSchema).default([]),
	translations: z.array(TranslationSchema).default([]),
})

export type PhraseFullType = z.infer<typeof PhraseFullSchema>
