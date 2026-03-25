import * as z from 'zod'
import { LangSchema } from '@/features/languages/schemas'

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

export const requestPromptPlaceholders = [
	`How to say to a cab driver 'hi, can you take me/are you free?'`,
	`I'm at lunch with a colleague; how do I say 'Broccoli is my favourite vegetable'?`,
	`Sincerely, but not like too deeply, I want to thank my neighbour auntie for helping me out recently`,
	`I want to compliment my friend's outfit (non flirty)`,
	`How do I say "Oh I love that place!" like a restaurant my friend is suggesting`,
	`I'd like to say "talk to you soon" but in a sort of business-y context`,
	`Help -- I need to learn to talk like a pirate to bond with my niece in her language`,
	`Hey everyone, how do I say: "this is delicious" in a casual way?`,
	`I'm meeting a friend's parents and I want to thank them for showing me around`,
	`Hey chat, I'm trying to better understand this song lyric...`,
	`Is there poetry in your language about garlic and how good it is?`,
]

export const RequestPhraseFormSchema = z.object({
	prompt: z
		.string()
		.min(10, { message: 'Your prompt must be at least 10 characters.' })
		.max(500, { message: 'Your prompt must be less than 500 characters.' }),
})

export type RequestPhraseFormInputs = z.infer<typeof RequestPhraseFormSchema>
