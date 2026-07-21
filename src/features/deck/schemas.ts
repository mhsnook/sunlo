import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'
import {
	LearningGoalEnumSchema,
	ReviewAnswerModeSchema,
} from '@/features/profile/schemas'

export const CardStatusEnumSchema = z.enum(['active', 'learned', 'skipped'])

export const CardDirectionSchema = z.enum(['forward', 'reverse'])
export type CardDirectionType = z.infer<typeof CardDirectionSchema>

// Base user_deck columns only. Per-deck card/review aggregates (cards_active,
// count_reviews_7d, most_recent_review_at, …) are derived client-side from
// cardsCollection / cardReviewsCollection — see useDeckCardStats /
// useDeckReviewCounts. language / lang_total_phrases live in languagesCollection.
export const DeckMetaRawSchema = z.object({
	uid: z.string(),
	lang: LangSchema,
	created_at: z.string(),
	archived: z.boolean(),
	daily_review_goal: z.number(),
	learning_goal: LearningGoalEnumSchema,
	preferred_translation_lang: LangSchema.nullable().default(null),
	review_answer_mode: ReviewAnswerModeSchema.nullable().default(null),
})

export const DeckMetaSchema = DeckMetaRawSchema.extend({
	language: z.string(),
})

export type DeckMetaType = z.infer<typeof DeckMetaSchema>

export const CardMetaSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	phrase_id: z.string().uuid(),
	uid: z.string().uuid(),
	lang: LangSchema,
	status: CardStatusEnumSchema,
	direction: CardDirectionSchema.default('forward'),
	updated_at: z.string(),
	last_reviewed_at: z.string().nullable().default(null),
	difficulty: z.number().nullable().default(null),
	stability: z.number().nullable().default(null),
})

export type CardMetaType = z.infer<typeof CardMetaSchema>
