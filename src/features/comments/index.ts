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
} from './schemas'

// Collections
export {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from './collections'

// Hooks
export {
	useOneComment,
	usePhrasesFromComment,
	useHasCommentUpvote,
	useAnyonesComments,
} from './hooks'
