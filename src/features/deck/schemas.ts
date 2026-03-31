import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'
import {
	LearningGoalEnumSchema,
	ReviewAnswerModeSchema,
} from '@/features/profile/schemas'

export const CardStatusEnumSchema = z.enum(['active', 'learned', 'skipped'])
export type CardStatusEnumType = z.infer<typeof CardStatusEnumSchema>

export const DeckMetaRawSchema = z.object({
	uid: z.string(),
	lang: LangSchema,
	created_at: z.string(),
	archived: z.boolean(),
	daily_review_goal: z.number(),
	learning_goal: LearningGoalEnumSchema,
	preferred_translation_lang: LangSchema.nullable().default(null),
	review_answer_mode: ReviewAnswerModeSchema.nullable().default(null),
	cards_active: z.number().default(0),
	cards_learned: z.number().default(0),
	cards_skipped: z.number().default(0),
	count_reviews_7d: z.number().default(0),
	count_reviews_7d_positive: z.number().default(0),
	lang_total_phrases: z.number().default(0),
	most_recent_review_at: z.string().nullable().default(null),
})

export const DeckMetaSchema = DeckMetaRawSchema.extend({
	theme: z.number(),
	language: z.string(),
})

export type DeckMetaRawType = z.infer<typeof DeckMetaRawSchema>
export type DeckMetaType = z.infer<typeof DeckMetaSchema>

export const CardMetaSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	phrase_id: z.string().uuid(),
	uid: z.string().uuid(),
	lang: LangSchema,
	status: CardStatusEnumSchema,
	updated_at: z.string(),
	last_reviewed_at: z.string().nullable().default(null),
	difficulty: z.number().nullable().default(null),
	stability: z.number().nullable().default(null),
})

export type CardMetaType = z.infer<typeof CardMetaSchema>
