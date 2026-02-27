// Feature: requests — Phrase requests & upvotes
// Public API for the requests domain

// Schemas & types
export {
	PhraseRequestSchema,
	type PhraseRequestType,
	PhraseRequestUpvoteSchema,
	type PhraseRequestUpvoteType,
	PhraseRequestStatusEnumSchema,
} from '@/lib/schemas/requests'

// Collections
export {
	phraseRequestsCollection,
	phraseRequestUpvotesCollection,
} from '@/lib/collections/requests'

// Hooks
export {
	useRequest,
	useRequestCounts,
	useRequestLinksPhraseIds,
	useRequestLinksWithComments,
	type FulfillRequestResponse,
} from '@/hooks/use-requests'
