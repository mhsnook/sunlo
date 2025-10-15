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

export type PublicProfileType = z.infer<typeof PublicProfileSchema>
