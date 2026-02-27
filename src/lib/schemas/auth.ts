import * as z from 'zod'
import { LangSchema } from './shared'

export const LanguageProficiencyEnumSchema = z.enum([
	'fluent',
	'proficient',
	'beginner',
])
export type LanguageProficiencyEnumType = z.infer<
	typeof LanguageProficiencyEnumSchema
>

export const LearningGoalEnumSchema = z.enum(['moving', 'family', 'visiting'])

export const LanguageKnownSchema = z.object({
	lang: LangSchema,
	level: LanguageProficiencyEnumSchema,
})
export type LanguageKnownType = z.infer<typeof LanguageKnownSchema>

export const LanguagesKnownSchema = z
	.array(LanguageKnownSchema)
	.min(1, 'Please add at least one language you know.')
export type LanguagesKnownType = z.infer<typeof LanguagesKnownSchema>

export const PublicProfileSchema = z.object({
	uid: z.string().uuid(),
	username: z.preprocess((val) => val ?? '', z.string()),
	avatar_path: z.preprocess((val) => val ?? '', z.string()),
})

export type PublicProfileType = z.infer<typeof PublicProfileSchema>

export const FontPreferenceSchema = z.enum(['default', 'dyslexic'])
export type FontPreferenceType = z.infer<typeof FontPreferenceSchema>

export const MyProfileSchema = PublicProfileSchema.extend({
	created_at: z.string(),
	languages_known: LanguagesKnownSchema,
	updated_at: z.string().nullable(),
	font_preference: FontPreferenceSchema.nullable().default('default'),
})

export type MyProfileType = z.infer<typeof MyProfileSchema>
