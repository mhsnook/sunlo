import * as z from 'zod'

export const CardStatusEnumSchema = z.enum(['active', 'learned', 'skipped'])
export const FriendRequestResponseEnumSchema = z.enum([
	'accept',
	'decline',
	'cancel',
	'remove',
	'invite',
])
export const FriendStatusEnumSchema = z.enum([
	'friends',
	'pending',
	'unconnected',
])
export const LanguageProficiencyEnumSchema = z.enum([
	'fluent',
	'proficient',
	'beginner',
])
export const LearningGoalEnumSchema = z.enum(['moving', 'family', 'visiting'])
export const PhraseRequestStatusEnumSchema = z.enum([
	'pending',
	'fulfilled',
	'cancelled',
])
export const MessageTypeEnumSchema = z.enum([
	'request',
	'recommendation',
	'accepted',
])

export const LangSchema = z
	.string()
	.length(3, { message: 'Please select a language' })

export type LangType = z.infer<typeof LangSchema>

export const LanguageKnownSchema = z.object({
	lang: LangSchema,
	level: LanguageProficiencyEnumSchema,
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

export const MyProfileSchema = PublicProfileSchema.extend({
	created_at: z.string(),
	languages_known: LanguagesKnownSchema,
	updated_at: z.string().nullable(),
})

export type MyProfileType = z.infer<typeof MyProfileSchema>

export const PhraseTagSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
})

export type PhraseTagType = z.infer<typeof PhraseTagSchema>

export const TranslationSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	text: z.string(),
	lang: LangSchema,
	phrase_id: z.string().uuid(),
	added_by: z.string().uuid().nullable(),
})

export type TranslationType = z.infer<typeof TranslationSchema>

export const PhraseFullSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	text: z.string(),
	lang: LangSchema,
	added_by: z.string().uuid().nullable(),
	// added_by_profile: PublicProfileSchema.optional(),
	avg_difficulty: z.number().nullable().default(null),
	avg_stability: z.number().nullable().default(null),
	count_active: z.number().nullable().default(null),
	count_cards: z.number().nullable().default(null),
	count_learned: z.number().nullable().default(null),
	count_skipped: z.number().nullable().default(null),
	percent_active: z.number().nullable().default(null),
	percent_learned: z.number().nullable().default(null),
	percent_skipped: z.number().nullable().default(null),
	rank_least_difficult: z.number().nullable().default(null),
	rank_least_skipped: z.number().nullable().default(null),
	rank_most_learned: z.number().nullable().default(null),
	rank_most_stable: z.number().nullable().default(null),
	rank_newest: z.number().nullable().default(null),
	request_id: z.string().uuid().nullable().default(null),
	// don't want this to be null; would rather coerce to []
	tags: z.array(PhraseTagSchema).default([]).nullable(),
	translations: z.array(TranslationSchema).default([]),
})

export type PhraseFullType = z.infer<typeof PhraseFullSchema>

export const PhraseRequestSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	requester_uid: z.string().uuid(),
	lang: LangSchema,
	prompt: z.string(),
	status: PhraseRequestStatusEnumSchema,
	fulfilled_at: z.string().nullable(),
})

export type PhraseRequestType = z.infer<typeof PhraseRequestSchema>

export const LanguageSchema = z.object({
	lang: LangSchema,
	alias_of: z.string().length(3).nullable(),
	name: z.string(),
	leaners: z.number().default(0),
	phrases_to_learn: z.number().default(0),
	rank: z.number().nullable(),
	display_order: z.number().nullable(),
	tags: z.array(z.string()),
})

export type LanguageType = z.infer<typeof LanguageSchema>

export const DeckMetaSchema = z.object({
	uid: z.string(),
	lang: LangSchema,
	created_at: z.string(),
	archived: z.boolean().default(false),
	daily_review_goal: z.number().default(15),
	language: z.string(),
	learning_goal: LearningGoalEnumSchema,
	cards_active: z.number().default(0),
	cards_learned: z.number().default(0),
	cards_skipped: z.number().default(0),
	count_reviews_7d: z.number().default(0),
	count_reviews_7d_positive: z.number().default(0),
	lang_total_phrases: z.number().default(0),
	most_recent_review_at: z.string().nullable(),
})

export type DeckMetaType = z.infer<typeof DeckMetaSchema>

export const CardMetaSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	phrase_id: z.string().uuid(),
	uid: z.string().uuid(),
	lang: LangSchema,
	current_timestamp: z.string(),
	difficulty: z.number().nullable(),
	last_reviewed_at: z.string().nullable(),
	retrievability_now: z.number().nullable(),
	stability: z.number().nullable(),
	status: CardStatusEnumSchema,
	updated_at: z.string().nullable(),
})

export type CardMetaType = z.infer<typeof CardMetaSchema>

export const CardReviewSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	uid: z.string().uuid(),
	day_session: z.string().length(10),
	lang: LangSchema,
	phrase_id: z.string().uuid(),
	score: z.number(),
	day_first_review: z.boolean().default(true),
	difficulty: z.number().nullable(),
	review_time_retrievability: z.number().nullable(),
	stability: z.number().nullable(),
	updated_at: z.string().nullable(),
})

export type CardReviewType = z.infer<typeof CardReviewSchema>

export const DailyReviewStateSchema = z.object({
	created_at: z.string(),
	day_session: z.string().length(10),
	lang: LangSchema,
	manifest: z.array(z.string().uuid()),
	uid: z.string().uuid(),
})

export type DailyReviewStateType = z.infer<typeof DailyReviewStateSchema>

export const FriendSummarySchema = z.object({
	uid: z.string().uuid(),
	uid_less: z.string().uuid(),
	uid_more: z.string().uuid(),
	status: FriendStatusEnumSchema,
	most_recent_created_at: z.string(),
	most_recent_uid_by: z.string().uuid(),
	most_recent_uid_for: z.string().uuid(),
	most_recent_action_type: FriendRequestResponseEnumSchema,
})

export type FriendSummaryType = z.infer<typeof FriendSummarySchema>

export const ChatMessageSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	sender_uid: z.string().uuid(),
	recipient_uid: z.string().uuid(),
	message_type: MessageTypeEnumSchema,
	phrase_id: z.string().uuid().nullable(),
	request_id: z.string().uuid().nullable(),
	related_message_id: z.string().uuid().nullable(),
	lang: LangSchema,
})

export type ChatMessageType = z.infer<typeof ChatMessageSchema>
