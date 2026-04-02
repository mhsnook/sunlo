// Feature: comments — Comment system (on requests and phrases)
// Public API for the comments domain

// Schemas & types
export {
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
	PhraseCommentSchema,
	type PhraseCommentType,
	CommentTranslationLinkSchema,
	type CommentTranslationLinkType,
	PhraseCommentUpvoteSchema,
	type PhraseCommentUpvoteType,
} from './schemas'

// Collections
export {
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
	phraseCommentsCollection,
	commentTranslationLinksCollection,
	phraseCommentUpvotesCollection,
} from './collections'
