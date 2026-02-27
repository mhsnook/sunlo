import * as z from 'zod'
import { LangSchema } from './shared'

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
