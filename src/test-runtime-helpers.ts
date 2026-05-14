// Expose collections to window in dev/test mode for E2E testing.
// Production builds resolve import.meta.env.DEV to false; the dynamic
// imports inside the dead-if block are tree-shaken so no collection
// code ends up in the prod bundle.
if (
	typeof window !== 'undefined' &&
	(import.meta.env.DEV || import.meta.env.MODE === 'test')
) {
	void (async () => {
		const [
			{ phrasesCollection },
			{ cardsCollection, decksCollection },
			{ cardReviewsCollection, reviewDaysCollection },
			{ phraseRequestsCollection },
			{ phrasePlaylistsCollection },
		] = await Promise.all([
			import('./features/phrases/collections'),
			import('./features/deck/collections'),
			import('./features/review/collections'),
			import('./features/requests/collections'),
			import('./features/playlists/collections'),
		])
		// @ts-expect-error assigning to global window
		window.__phrasesCollection = phrasesCollection
		// @ts-expect-error assigning to global window
		window.__cardsCollection = cardsCollection
		// @ts-expect-error assigning to global window
		window.__phraseRequestsCollection = phraseRequestsCollection
		// @ts-expect-error assigning to global window
		window.__phrasePlaylistsCollection = phrasePlaylistsCollection
		// @ts-expect-error assigning to global window
		window.__decksCollection = decksCollection
		// @ts-expect-error assigning to global window
		window.__cardReviewsCollection = cardReviewsCollection
		// @ts-expect-error assigning to global window
		window.__reviewDaysCollection = reviewDaysCollection
	})()
}
