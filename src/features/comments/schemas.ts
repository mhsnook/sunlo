import * as z from 'zod'

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
	comment_id: z.string().uuid(),
})

export type CommentUpvoteType = z.infer<typeof CommentUpvoteSchema>

export const PhraseCommentSchema = z.object({
	id: z.string().uuid(),
	phrase_id: z.string().uuid(),
	parent_comment_id: z.string().uuid().nullable(),
	uid: z.string().uuid(),
	content: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	upvote_count: z.number(),
})

export type PhraseCommentType = z.infer<typeof PhraseCommentSchema>

export const CommentTranslationLinkSchema = z.object({
	id: z.string().uuid(),
	phrase_id: z.string().uuid(),
	comment_id: z.string().uuid(),
	translation_id: z.string().uuid(),
	uid: z.string().uuid(),
	created_at: z.string(),
})

export type CommentTranslationLinkType = z.infer<
	typeof CommentTranslationLinkSchema
>

export const PhraseCommentUpvoteSchema = z.object({
	comment_id: z.string().uuid(),
})

export type PhraseCommentUpvoteType = z.infer<typeof PhraseCommentUpvoteSchema>
