// Feature: requests — Phrase requests, comments, upvotes (one discussion module)
// Public API for the requests domain. Comments live here because a comment
// only exists in the context of a request; the boundary is deliberately wide.

// Schemas & types
export {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
	PhraseRequestStatusEnumSchema,
	RequestCommentSchema,
	type RequestCommentType,
	CommentPhraseLinkSchema,
	type CommentPhraseLinkType,
	CommentUpvoteSchema,
	type CommentUpvoteType,
} from './schemas'

// Collections
export {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
	commentsCollection,
	commentPhraseLinksCollection,
	commentUpvotesCollection,
} from './collections'

// Live collections
export { phraseRequestsActive } from './live'

// Hooks
export {
	useRequest,
	useRequestCounts,
	useRequestLinksPhraseIds,
	useHasRequestUpvote,
	useAnyonesPhraseRequests,
	useOneComment,
	useCommentPhraseLinks,
	useHasCommentUpvote,
	useAnyonesComments,
} from './hooks'
