import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'

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

export const ReviewAnswerModeSchema = z.enum(['4-buttons', '2-buttons'])
export type ReviewAnswerModeType = z.infer<typeof ReviewAnswerModeSchema>

// Generic jsonb bag for open-ended per-user profile state. Today it holds
// 'needs-onboarding'; the catchall leaves room for intro-message
// dismissals and other flags without a schema change every time.
export const ProfileFlagsSchema = z
	.object({
		'needs-onboarding': z.boolean().optional(),
	})
	.catchall(z.union([z.boolean(), z.string()]))
export type ProfileFlagsType = z.infer<typeof ProfileFlagsSchema>

export const MyProfileSchema = PublicProfileSchema.extend({
	created_at: z.string(),
	// Allow empty: a trigger-created profile starts with no languages, and
	// the user fills them in via /getting-started. The min(1) rule lives on
	// LanguagesKnownSchema, which the onboarding form uses for validation.
	languages_known: z.array(LanguageKnownSchema),
	updated_at: z.string().nullable(),
	font_preference: FontPreferenceSchema.nullable().default('default'),
	review_answer_mode: ReviewAnswerModeSchema.nullable().default('2-buttons'),
	sound_enabled: z.boolean().default(true),
	flags: ProfileFlagsSchema.default({}),
})

export type MyProfileType = z.infer<typeof MyProfileSchema>
