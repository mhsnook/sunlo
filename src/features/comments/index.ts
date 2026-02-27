// Feature: comments — Comment system (on requests)
// Public API for the comments domain

// Schemas & types
export {
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
} from '@/lib/schemas/comments'

// Collections
export {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from '@/lib/collections/comments'
