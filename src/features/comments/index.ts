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
	LinkUpvoteSchema,
	type LinkUpvoteType,
} from './schemas'

// Collections
export {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	linkUpvotesCollection,
} from './collections'
