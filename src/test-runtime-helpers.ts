import {
	cardsCollection,
	phraseRequestsCollection,
	phrasesCollection,
} from './lib/collections'

// Expose collections to window in dev/test mode for E2E testing
if (
	typeof window !== 'undefined' &&
	(import.meta.env.DEV || import.meta.env.MODE === 'test')
) {
	// @ts-expect-error assigning to global window
	window.__phrasesCollection = phrasesCollection
	// @ts-expect-error assigning to global window
	window.__cardsCollection = cardsCollection
	// @ts-expect-error assigning to global window
	window.__phraseRequestsCollection = phraseRequestsCollection
}
