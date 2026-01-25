/**
 * Scenetest Scene Specs for Sunlo
 *
 * These specs describe user journeys through the application.
 * Engineers should add inline assertions in components using useTestEffect.
 *
 * API Extensions Used (not yet in Scenetest core):
 * - user.seeId(id) - waits for data-testid to be visible
 * - user.clickId(id) - clicks element by data-testid
 * - user.typeInto(id, text) - types into input by data-testid
 * - user.seeText(text) - waits for text to be visible
 * - user.notSeeId(id) - verifies element is NOT visible
 * - user.selectOption(id, value) - selects option in dropdown
 * - cast('role', { fixtures }) - creates actor with test fixtures
 */

import { scene } from '@scenetest/cli'

// =============================================================================
// AUTHENTICATION & ONBOARDING
// =============================================================================

scene('visitor logs in and sees their decks', async ({ cast }) => {
	const visitor = await cast('visitor')

	await visitor.goto('/learn')
	await visitor.seeId('login-link')
	await visitor.clickId('login-link')

	// Fill login form
	await visitor.seeId('login-form')
	await visitor.typeInto('login-email-input', 'sunloapp@gmail.com')
	await visitor.typeInto('login-password-input', 'password')
	await visitor.clickId('login-submit-button')

	// Handle welcome page if shown
	await visitor.seeId('welcome-page')
	await visitor.clickId('go-to-decks-button')

	// Verify dashboard loaded
	await visitor.seeId('decks-list-grid')
	await visitor.seeId('friends-section')
})

scene(
	'new user completes onboarding and affirms community norms',
	async ({ cast }) => {
		const newUser = await cast('new-user')

		await newUser.goto('/welcome')
		await newUser.seeId('welcome-page')
		await newUser.seeId('community-norms-dialog')

		// Affirm community norms
		await newUser.clickId('affirm-community-norms-button')

		// Should see welcome content
		await newUser.seeId('sunlo-welcome-explainer')
		await newUser.clickId('go-to-decks-button')

		// Should land on learn page
		await newUser.seeId('decks-list-grid')
	}
)

scene('user signs out and is redirected to home', async ({ cast }) => {
	const user = await cast('learner')

	await user.goto('/learn')
	await user.seeId('decks-list-grid')

	// Open user menu and sign out
	await user.clickId('sidebar-user-menu-trigger')
	await user.clickId('sidebar-signout-button')

	// Should be on home page, logged out
	await user.seeId('login-link')
	await user.notSeeId('sidebar-user-menu-trigger')
})

// =============================================================================
// DECK MANAGEMENT
// =============================================================================

scene('learner creates a new deck', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.seeId('decks-list-grid')

	// Open deck switcher and click new deck
	await learner.clickId('deck-switcher-button')
	await learner.clickId('new-deck-menu-item')

	// Should be on add-deck page
	await learner.seeId('add-deck-form')

	// Select a language
	await learner.clickId('language-selector-button')
	await learner.typeInto('language-search-input', 'Spanish')
	await learner.clickId('language-option-spa')

	// Submit the form
	await learner.clickId('start-learning-button')

	// Should see success and navigate to new deck
	await learner.seeId('toast-deck-created')
	await learner.seeId('deck-feed-page')
})

scene('learner updates daily review goal', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-hin')

	// Open context menu and go to settings
	await learner.clickId('top-right-context-menu')
	await learner.clickId('deck-settings-menu-item')

	await learner.seeId('deck-settings-page')

	// Change review goal
	await learner.clickId('review-goal-option-10')
	await learner.clickId('update-daily-goal-button')

	// Should see success toast
	await learner.seeId('toast-settings-updated')
})

scene('learner updates learning goal', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-hin')

	// Navigate to settings
	await learner.clickId('top-right-context-menu')
	await learner.clickId('deck-settings-menu-item')

	await learner.seeId('deck-settings-page')

	// Change learning goal
	await learner.clickId('learning-goal-option-family')
	await learner.clickId('update-goal-button')

	await learner.seeId('toast-settings-updated')
})

scene('learner archives and restores a deck', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-spa')

	// Navigate to settings and archive
	await learner.clickId('top-right-context-menu')
	await learner.clickId('deck-settings-menu-item')

	await learner.clickId('archive-deck-button')
	await learner.seeId('archive-confirmation-dialog')
	await learner.clickId('confirm-archive-button')

	await learner.seeId('toast-deck-archived')

	// Go back to deck list
	await learner.clickId('back-to-all-decks-link')

	// Deck should not be visible
	await learner.notSeeId('deck-card-spa')

	// View archived decks
	await learner.clickId('view-archived-decks-link')
	await learner.seeId('deck-card-spa')

	// Restore the deck
	await learner.clickId('deck-card-link-spa')
	await learner.clickId('top-right-context-menu')
	await learner.clickId('deck-settings-menu-item')

	await learner.clickId('restore-deck-button')
	await learner.seeId('restore-confirmation-dialog')
	await learner.clickId('confirm-restore-button')

	await learner.seeId('toast-deck-restored')
})

// =============================================================================
// CARD MANAGEMENT
// =============================================================================

scene('learner adds a phrase to their deck', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['phrase-without-card'] })

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	// Navigate to phrase from feed
	await learner.clickId('feed-phrase-link')

	await learner.seeId('phrase-detail-page')

	// Add to deck
	await learner.clickId('card-status-dropdown')
	await learner.seeText('Not in deck')
	await learner.clickId('add-to-deck-option')

	await learner.seeId('toast-phrase-added')
})

scene('learner changes card status through all states', async ({ cast }) => {
	const learner = await cast('learner', {
		fixtures: ['phrase-with-active-card'],
	})

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')
	await learner.clickId('feed-phrase-link')

	await learner.seeId('phrase-detail-page')

	// Status should be Active
	await learner.clickId('card-status-dropdown')
	await learner.seeText('Active')

	// Change to Learned
	await learner.clickId('set-learned-option')
	await learner.seeId('toast-status-updated')

	// Change to Skipped
	await learner.clickId('card-status-dropdown')
	await learner.clickId('ignore-card-option')
	await learner.seeId('toast-status-updated')

	// Change back to Active
	await learner.clickId('card-status-dropdown')
	await learner.clickId('activate-card-option')
	await learner.seeId('toast-status-updated')
})

// =============================================================================
// NAVIGATION
// =============================================================================

scene('learner navigates within a deck using sidebar', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-hin')

	// Navigate to feed
	await learner.clickId('sidebar-link--learn-lang-feed')
	await learner.seeId('deck-feed-page')

	// Navigate to review
	await learner.clickId('sidebar-link--learn-lang-review')
	await learner.seeId('review-setup-page')

	// Navigate to search
	await learner.clickId('sidebar-link--learn-lang-search')
	await learner.seeId('search-page')

	// Navigate to contributions
	await learner.clickId('sidebar-link--learn-lang-contributions')
	await learner.seeId('contributions-page')
})

scene('learner switches between decks', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.seeId('decks-list-grid')

	// Go to Hindi deck
	await learner.clickId('deck-card-link-hin')
	await learner.seeId('deck-feed-page')

	// Go back to deck list
	await learner.clickId('back-to-decks-link')
	await learner.seeId('decks-list-grid')

	// Go to Tamil deck
	await learner.clickId('deck-card-link-tam')
	await learner.seeId('deck-feed-page')
})

scene('learner accesses profile from user menu', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')

	await learner.clickId('sidebar-user-menu-trigger')
	await learner.clickId('profile-menu-item')

	await learner.seeId('profile-page')
	await learner.seeText('Display Preferences')
})

scene('learner uses search functionality', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	await learner.clickId('sidebar-link--learn-lang-search')
	await learner.seeId('search-page')

	await learner.typeInto('search-input', 'hello')
	await learner.seeId('search-results')
})

// =============================================================================
// PHRASE REQUESTS
// =============================================================================

scene('learner creates a new phrase request', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn/hin/contributions')
	await learner.clickId('contributions-tab--requests')

	await learner.clickId('new-request-link')
	await learner.seeId('new-request-form')

	await learner.typeInto(
		'request-prompt-input',
		'How do I say "good morning" casually?'
	)
	await learner.clickId('post-request-button')

	await learner.seeId('toast-request-created')
	await learner.seeId('request-detail-page')
})

scene('learner edits their request', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['owned-request'] })

	await learner.goto('/learn/hin/requests/:requestId')
	await learner.seeId('request-detail-page')

	await learner.clickId('update-request-button')
	await learner.seeId('edit-request-dialog')

	await learner.typeInto(
		'edit-request-prompt-input',
		'Updated: How do I say "good afternoon"?'
	)
	await learner.clickId('save-request-button')

	await learner.seeId('toast-request-updated')
	await learner.seeText('Updated: How do I say "good afternoon"?')
})

scene('learner deletes their request', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['owned-request'] })

	await learner.goto('/learn/hin/requests/:requestId')
	await learner.seeId('request-detail-page')

	await learner.clickId('delete-request-button')
	await learner.seeId('delete-request-dialog')
	await learner.clickId('confirm-delete-button')

	await learner.seeId('toast-request-deleted')
	await learner.seeId('deck-feed-page')
})

scene('non-owner cannot edit or delete request', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['other-user-request'] })

	await learner.goto('/learn/hin/requests/:requestId')
	await learner.seeId('request-detail-page')

	// Edit and delete buttons should not be visible
	await learner.notSeeId('update-request-button')
	await learner.notSeeId('delete-request-button')
})

scene('learner copies comment permalink', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['request-with-comment'] })

	await learner.goto('/learn/hin/requests/:requestId')
	await learner.seeId('comment-item')

	await learner.clickId('comment-context-menu-trigger')
	await learner.clickId('copy-link-menu-item')

	await learner.seeId('toast-link-copied')
})

// =============================================================================
// PLAYLISTS
// =============================================================================

scene('learner edits their playlist', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['owned-playlist'] })

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.seeId('playlist-detail-page')

	await learner.clickId('update-playlist-button')
	await learner.seeId('edit-playlist-dialog')

	await learner.typeInto('playlist-title-input', 'Updated Playlist Title')
	await learner.typeInto('playlist-description-input', 'New description')
	await learner.typeInto(
		'playlist-href-input',
		'https://youtube.com/watch?v=test'
	)
	await learner.clickId('save-playlist-button')

	await learner.seeId('toast-playlist-updated')
	await learner.seeText('Updated Playlist Title')
})

scene('learner deletes their playlist', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['owned-playlist'] })

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.seeId('playlist-detail-page')

	await learner.clickId('delete-playlist-button')
	await learner.seeId('delete-playlist-dialog')
	await learner.clickId('confirm-delete-button')

	await learner.seeId('toast-playlist-deleted')
	await learner.seeId('deck-feed-page')
})

scene('non-owner cannot manage playlist', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['other-user-playlist'] })

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.seeId('playlist-detail-page')

	await learner.notSeeId('update-playlist-button')
	await learner.notSeeId('delete-playlist-button')
	await learner.notSeeId('manage-phrases-button')
})

scene('learner adds phrase to playlist', async ({ cast }) => {
	const learner = await cast('learner', {
		fixtures: ['owned-playlist-with-phrases'],
	})

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.clickId('manage-phrases-button')

	await learner.seeId('manage-phrases-dialog')
	await learner.clickId('add-phrases-button')

	await learner.typeInto('phrase-search-input', 'test phrase')
	await learner.clickId('phrase-checkbox')
	await learner.clickId('add-flashcard-button')

	await learner.seeId('toast-phrase-added')
})

scene('learner removes phrase from playlist', async ({ cast }) => {
	const learner = await cast('learner', {
		fixtures: ['owned-playlist-with-phrases'],
	})

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.clickId('manage-phrases-button')

	await learner.seeId('manage-phrases-dialog')
	await learner.clickId('remove-phrase-button')

	await learner.seeId('toast-phrase-removed')
})

scene('learner reorders phrases in playlist', async ({ cast }) => {
	const learner = await cast('learner', {
		fixtures: ['owned-playlist-with-phrases'],
	})

	await learner.goto('/learn/hin/playlists/:playlistId')
	await learner.clickId('manage-phrases-button')

	await learner.seeId('manage-phrases-dialog')
	await learner.clickId('move-phrase-down-button')

	// Order should change (verified by inline assertion in component)
})

// =============================================================================
// FEED
// =============================================================================

scene(
	'learner views activity feed with requests, playlists, and phrases',
	async ({ cast }) => {
		const learner = await cast('learner')

		await learner.goto('/learn')
		await learner.clickId('deck-card-link-hin')

		await learner.seeId('deck-feed-page')
		await learner.seeId('feed-item-list')

		// Feed should show different content types
		await learner.seeId('feed-item-request')
		await learner.seeId('feed-item-playlist')
		await learner.seeId('feed-item-phrase')
	}
)

scene('learner switches to Popular tab on feed', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	await learner.seeId('deck-feed-page')
	await learner.clickId('feed-tab-popular')

	// Items should be sorted by popularity (verified by inline assertion)
	await learner.seeId('feed-item-list')
})

scene('learner upvotes a playlist in feed', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['playlist-in-feed'] })

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	await learner.seeId('feed-item-playlist')
	await learner.clickId('upvote-playlist-button')

	// Upvote count should increment (verified by inline assertion)
	await learner.seeText('1')

	// Click again to remove upvote
	await learner.clickId('upvote-playlist-button')
	await learner.seeText('0')
})

scene('feed loads more items on scroll', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['many-feed-items'] })

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	await learner.seeId('deck-feed-page')
	await learner.seeId('feed-item-list')

	// Scroll to bottom (API extension needed)
	await learner.scrollToBottom()

	// Should load more items or show load more button
	await learner.seeId('load-more-button')
	await learner.clickId('load-more-button')

	// More items should appear (verified by inline assertion)
})

// =============================================================================
// FRIENDS & CHAT
// =============================================================================

scene('learner views chat messages from a friend', async ({ cast }) => {
	const learner = await cast('learner')

	await learner.goto('/learn')
	await learner.clickId('sidebar-link--friends-chats')

	await learner.seeId('chats-page')
	await learner.seeId('friend-chat-list')

	// Click on a friend's chat
	await learner.clickId('friend-chat-link')

	await learner.seeId('chat-messages-container')
	await learner.seeId('chat-message-bubble')
})

scene('opening a chat marks messages as read', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['unread-message'] })

	await learner.goto('/learn')
	await learner.clickId('sidebar-link--friends-chats')

	await learner.seeId('chats-page')

	// Should see unread indicator
	await learner.seeId('unread-badge')

	// Open the chat
	await learner.clickId('friend-chat-link')

	await learner.seeId('chat-messages-container')

	// Unread badge should disappear (verified by inline assertion in component)
})

// =============================================================================
// REVIEW
// =============================================================================

scene('learner starts a review session', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['cards-due-for-review'] })

	await learner.goto('/learn')
	await learner.clickId('deck-card-link-hin')

	await learner.clickId('sidebar-link--learn-lang-review')
	await learner.seeId('review-setup-page')

	// Should see review stats
	await learner.seeText('Total cards')
	await learner.seeId('start-review-button')

	await learner.clickId('start-review-button')
	await learner.seeId('review-session-page')
	await learner.seeId('flashcard')
})

scene('learner completes a review session', async ({ cast }) => {
	const learner = await cast('learner', { fixtures: ['cards-due-for-review'] })

	await learner.goto('/learn/hin/review')
	await learner.clickId('start-review-button')

	await learner.seeId('review-session-page')
	await learner.seeId('flashcard')

	// Reveal answer
	await learner.clickId('reveal-answer-button')

	// Rate the card
	await learner.clickId('rating-good-button')

	// Continue until done (in real test, would loop)
	await learner.seeId('review-complete-page')
})

// =============================================================================
// LOGGED OUT NAVIGATION
// =============================================================================

scene('visitor can browse languages without logging in', async ({ cast }) => {
	const visitor = await cast('visitor')

	await visitor.goto('/')
	await visitor.seeId('landing-page')

	await visitor.clickId('browse-languages-link')
	await visitor.seeId('browse-page')
	await visitor.seeId('language-card-list')

	// Click on a language
	await visitor.clickId('language-card-hin')
	await visitor.seeId('language-detail-page')
})

scene('visitor sees login prompt on protected pages', async ({ cast }) => {
	const visitor = await cast('visitor')

	await visitor.goto('/learn')

	// Should see browse prompt for logged out users
	await visitor.seeId('logged-out-learn-page')
	await visitor.seeId('browse-languages-prompt')
	await visitor.seeId('login-link')
})
