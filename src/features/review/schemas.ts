import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'
import { CardDirectionSchema } from '@/features/deck/schemas'
import { type ManifestEntry } from './manifest'

export const CardReviewSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	uid: z.string().uuid(),
	day_session: z.string().length(10),
	lang: LangSchema,
	phrase_id: z.string().uuid(),
	direction: CardDirectionSchema.default('forward'),
	score: z.number(),
	// Which session stage recorded this review, mirroring
	// `user_deck_review_state.stage`: 1 = first pass, 2 = go-back pass,
	// 3 = again-round re-review. FSRS reads only the scoring stages (1–2);
	// stage-3 rows are tracking-only and carry null FSRS columns.
	stage: z.number().int().min(1).max(3),
	difficulty: z.number().nullable(),
	review_time_retrievability: z.number().nullable(),
	stability: z.number().nullable(),
	updated_at: z.string().nullable(),
})

export type CardReviewType = z.infer<typeof CardReviewSchema>

// The immutable session row: written once at session creation, and the FK
// target for user_card_review. Progress (`stage`) is no longer here — it lives
// in the append-only review_milestone log (see ReviewMilestoneSchema).
export const DailyReviewStateSchema = z.object({
	created_at: z.string(),
	day_session: z.string().length(10),
	lang: LangSchema,
	// Branding is compile-time only — cast the validated array in one shot
	// instead of mapping, to avoid a per-parse allocation.
	manifest: z
		.array(z.string())
		.nullable()
		.transform(
			(arr): Array<ManifestEntry> | null => arr as Array<ManifestEntry> | null
		),
	uid: z.string().uuid(),
})

export type DailyReviewStateType = z.infer<typeof DailyReviewStateSchema>

// Append-only progress log for a review session. Each stage transition is a new
// row; the current stage is the `stage` of the latest milestone per session.
export const ReviewMilestoneSchema = z.object({
	id: z.string().uuid(),
	uid: z.string().uuid(),
	lang: LangSchema,
	day_session: z.string().length(10),
	created_at: z.string(),
	event: z.enum(['session_started', 'stage_advanced', 'session_completed']),
	stage: z.number().int().min(0).max(5).nullable(),
})

export type ReviewMilestoneType = z.infer<typeof ReviewMilestoneSchema>
