import dayjs from 'dayjs'
import * as z from 'zod'
import timezone from 'dayjs/plugin/timezone.js'
import utc from 'dayjs/plugin/utc.js'
import type { uuid } from '@/types/main'

dayjs.extend(timezone)
dayjs.extend(utc)

export const CardStatusEnumSchema = z.enum(['active', 'learned', 'skipped'])
export type CardStatusEnumType = z.infer<typeof CardStatusEnumSchema>

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
export type LanguageProficiencyEnumType = z.infer<
	typeof LanguageProficiencyEnumSchema
>

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
	'playlist',
])

export const UserContributionsTabs = z.object({
	contributionsTab: z
		.enum(['requests', 'phrases', 'playlists', 'answers', 'comments'])
		.optional(),
})

export const LangSchema = z
	.string()
	.length(3, { message: 'Please select a language' })

export type LangType = z.infer<typeof LangSchema>

export const LanguageKnownSchema = z.object({
	lang: LangSchema,
	level: LanguageProficiencyEnumSchema,
})
export type LanguageKnownType = z.infer<typeof LanguageKnownSchema>

export const LanguagesKnownSchema = z
	.array(LanguageKnownSchema)
	.min(1, 'Please add at least one language you know.')
export type LanguagesKnownType = z.infer<typeof LanguagesKnownSchema>

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

export const LangTagSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	name: z.string(),
	lang: LangSchema,
	added_by: z.string().uuid(),
})

export type LangTagType = z.infer<typeof LangTagSchema>

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

export const PhraseRequestSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	requester_uid: z.string().uuid(),
	lang: LangSchema,
	prompt: z.string(),
	upvote_count: z.number().default(0),
	deleted: z.boolean().default(false),
	updated_at: z.string().nullable().optional(),
})

export type PhraseRequestType = z.infer<typeof PhraseRequestSchema>

export const PhraseRequestUpvoteSchema = z.object({
	request_id: z.string().uuid(),
})

export type PhraseRequestUpvoteType = z.infer<typeof PhraseRequestUpvoteSchema>

export const LanguageSchema = z.object({
	lang: LangSchema,
	alias_of: z.string().length(3).nullable(),
	name: z.string(),
	learners: z.number().default(0),
	phrases_to_learn: z.number().default(0),
	rank: z.number().nullable(),
	display_order: z.number().nullable(),
})

export type LanguageType = z.infer<typeof LanguageSchema>

export const DeckMetaRawSchema = z.object({
	uid: z.string(),
	lang: LangSchema,
	created_at: z.string(),
	archived: z.boolean(),
	daily_review_goal: z.number(),
	learning_goal: LearningGoalEnumSchema,
	preferred_translation_lang: LangSchema.nullable().default(null),
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

export const CardReviewSchema = z.object({
	id: z.string().uuid(),
	created_at: z.string(),
	uid: z.string().uuid(),
	day_session: z.string().length(10),
	lang: LangSchema,
	phrase_id: z.string().uuid(),
	score: z.number(),
	day_first_review: z.boolean(),
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
	manifest: z.array(z.string().uuid()).nullable(),
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
	playlist_id: z.string().uuid().nullable(),
	related_message_id: z.string().uuid().nullable(),
	lang: LangSchema,
	is_read: z.boolean(),
})

export type ChatMessageType = z.infer<typeof ChatMessageSchema>

export type ChatMessageRelType = ChatMessageType & {
	isByMe: boolean
	friendUid: uuid
}

export const RequestCommentSchema = z.object({
	id: z.string().uuid(),
	request_id: z.string().uuid(),
	parent_comment_id: z.string().uuid().nullable(),
	uid: z.string().uuid(),
	content: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	upvote_count: z.number(),
})

export type RequestCommentType = z.infer<typeof RequestCommentSchema>

export const CommentPhraseLinkSchema = z.object({
	id: z.string().uuid(),
	request_id: z.string().uuid(),
	comment_id: z.string().uuid(),
	phrase_id: z.string().uuid(),
	uid: z.string().uuid(),
	created_at: z.string(),
})

export type CommentPhraseLinkType = z.infer<typeof CommentPhraseLinkSchema>

export const CommentUpvoteSchema = z.object({
	// id: z.string().uuid(),
	comment_id: z.string().uuid(),
	// uid: z.string().uuid(),
	// created_at: z.string(),
})

export type CommentUpvoteType = z.infer<typeof CommentUpvoteSchema>

export const FeedActivityTypeEnumSchema = z.enum([
	'request',
	'playlist',
	'phrase',
])

export const FeedActivityPayloadRequestSchema = z.object({
	prompt: z.string(),
	upvote_count: z.number(),
})

export const FeedActivityPayloadPlaylistSchema = z.object({
	title: z.string(),
	description: z.string().nullable(),
	phrase_count: z.number().default(0),
	upvote_count: z.number().default(0),
})

export const FeedActivityPayloadPhraseSourceSchema = z.union([
	z.object({
		type: z.literal('request'),
		id: z.string().uuid(),
		title: z.string().optional(),
		comment_id: z.string().uuid().optional(),
	}),
	z.object({
		type: z.literal('playlist'),
		id: z.string().uuid(),
		title: z.string(),
		// follows: z.number().optional(),
	}),
])

export const FeedActivityPayloadPhraseSchema = z.object({
	text: z.string(),
	source: FeedActivityPayloadPhraseSourceSchema.nullable(),
})

export const FeedActivitySchema = z.object({
	id: z.string().uuid(),
	type: FeedActivityTypeEnumSchema,
	created_at: z.string(),
	lang: LangSchema,
	uid: z.string().uuid(),
	popularity: z.number(),
	payload: z.union([
		FeedActivityPayloadRequestSchema,
		FeedActivityPayloadPlaylistSchema,
		FeedActivityPayloadPhraseSchema,
	]),
})

export type FeedActivityType = z.infer<typeof FeedActivitySchema>
