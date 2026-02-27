import * as z from 'zod'
import { LangSchema } from './shared'

export const PhraseRequestStatusEnumSchema = z.enum([
	'pending',
	'fulfilled',
	'cancelled',
])

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
