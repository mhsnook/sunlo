/**
 * Scenetest Scene Specs for Sunlo
 *
 * These specs describe user journeys through the application.
 * Engineers should add inline assertions in components using useTestEffect.
 *
 * API Extensions Used (not yet in Scenetest core):
 * - user.see(id) - waits for data-testid to be visible
 * - user.click(id) - clicks element by data-testid
 * - user.typeInto(id, text) - types into input by data-testid
 * - user.seeText(text) - waits for text to be visible
 * - user.notSee(id) - verifies element is NOT visible
 * - user.selectOption(id, value) - selects option in dropdown
 * - actor('role', { fixtures }) - creates actor with test fixtures
 */

import { scene } from '@scenetest/cli'

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Log in an actor using their email/password from the actor config.
 * Navigates to /login, fills the form, submits, and waits for redirect.
 */
async function loginAs(user: any) {
	await user.openTo('/login')
	await user.typeInto('email-input', user.email)
	await user.typeInto('password-input', user.password)
	await user.click('login-submit-button')
	// Wait for post-login redirect to settle
	await user.do(async (page: any) => {
		await page.waitForLoadState('networkidle')
	})
}

// =============================================================================
// AUTHENTICATION & ONBOARDING
// =============================================================================

scene('visitor logs in and sees their decks', async ({ actor }) => {
	const visitor = await actor('visitor')

	await visitor.openTo('/learn')
	await visitor.see('login-link')
	await visitor.click('login-link')

	// Fill login form
	await visitor.see('login-form')
	await visitor.typeInto('email-input', 'sunloapp@gmail.com')
	await visitor.typeInto('password-input', 'password')
	await visitor.click('login-submit-button')

	// Handle welcome page if shown
	await visitor.see('welcome-page')
	await visitor.click('go-to-decks-button')

	// Verify dashboard loaded
	await visitor.see('decks-list-grid')
	await visitor.see('friends-section')
})

scene(
	'new user completes onboarding and affirms community norms',
	async ({ actor }) => {
		const newUser = await actor('new-user')
		await loginAs(newUser)

		await newUser.openTo('/welcome')
		await newUser.see('welcome-page')
		await newUser.see('community-norms-dialog')

		// Affirm community norms
		await newUser.click('affirm-community-norms-button')

		// Should see welcome content
		await newUser.see('sunlo-welcome-explainer')
		await newUser.click('go-to-decks-button')

		// Should land on learn page
		await newUser.see('decks-list-grid')
	}
)

scene('user signs out and is redirected to home', async ({ actor }) => {
	const user = await actor('learner')
	await loginAs(user)

	await user.openTo('/learn')
	await user.see('decks-list-grid')

	// Open user menu and sign out
	await user.click('sidebar-user-menu-trigger')
	await user.click('sidebar-signout-button')

	// Should be on home page, logged out
	await user.see('login-link')
	await user.notSee('sidebar-user-menu-trigger')
})

// =============================================================================
// DECK MANAGEMENT
// =============================================================================

scene('learner creates a new deck', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.see('decks-list-grid')

	// Open deck switcher and click new deck
	await learner.click('deck-switcher-button')
	await learner.click('new-deck-menu-item')

	// Should be on add-deck page
	await learner.see('add-deck-form')

	// Select a language
	await learner.click('language-selector-button')
	await learner.typeInto('language-search-input', 'Spanish')
	await learner.click('language-option-spa')

	// Submit the form
	await learner.click('start-learning-button')

	// Should see success and navigate to new deck
	await learner.see('toast-deck-created')
	await learner.see('deck-feed-page')
})

scene('learner updates daily review goal', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-hin')

	// Open context menu and go to settings
	await learner.click('top-right-context-menu')
	await learner.click('deck-settings-menu-item')

	await learner.see('deck-settings-page')

	// Change review goal
	await learner.click('review-goal-option-10')
	await learner.click('update-daily-goal-button')

	// Should see success toast
	await learner.see('toast-settings-updated')
})

scene('learner updates learning goal', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-hin')

	// Navigate to settings
	await learner.click('top-right-context-menu')
	await learner.click('deck-settings-menu-item')

	await learner.see('deck-settings-page')

	// Change learning goal
	await learner.click('learning-goal-option-family')
	await learner.click('update-goal-button')

	await learner.see('toast-settings-updated')
})

scene('learner archives and restores a deck', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-spa')

	// Navigate to settings and archive
	await learner.click('top-right-context-menu')
	await learner.click('deck-settings-menu-item')

	await learner.click('archive-deck-button')
	await learner.see('archive-confirmation-dialog')
	await learner.click('confirm-archive-button')

	await learner.see('toast-deck-archived')

	// Go back to deck list
	await learner.click('back-to-all-decks-link')

	// Deck should not be visible
	await learner.notSee('deck-card-spa')

	// View archived decks
	await learner.click('view-archived-decks-link')
	await learner.see('deck-card-spa')

	// Restore the deck
	await learner.click('deck-card-link-spa')
	await learner.click('top-right-context-menu')
	await learner.click('deck-settings-menu-item')

	await learner.click('restore-deck-button')
	await learner.see('restore-confirmation-dialog')
	await learner.click('confirm-restore-button')

	await learner.see('toast-deck-restored')
})

// =============================================================================
// CARD MANAGEMENT
// =============================================================================

scene('learner adds a phrase to their deck', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	// Navigate to phrase from feed
	await learner.click('feed-phrase-link')

	await learner.see('phrase-detail-page')

	// Add to deck
	await learner.click('card-status-dropdown')
	await learner.seeText('Not in deck')
	await learner.click('add-to-deck-option')

	await learner.see('toast-phrase-added')
})

scene('learner changes card status through all states', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')
	await learner.click('feed-phrase-link')

	await learner.see('phrase-detail-page')

	// Status should be Active
	await learner.click('card-status-dropdown')
	await learner.seeText('Active')

	// Change to Learned
	await learner.click('set-learned-option')
	await learner.see('toast-status-updated')

	// Change to Skipped
	await learner.click('card-status-dropdown')
	await learner.click('ignore-card-option')
	await learner.see('toast-status-updated')

	// Change back to Active
	await learner.click('card-status-dropdown')
	await learner.click('activate-card-option')
	await learner.see('toast-status-updated')
})

// =============================================================================
// NAVIGATION
// =============================================================================

scene('learner navigates within a deck using sidebar', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-hin')

	// Navigate to feed
	await learner.click('sidebar-link--learn-lang-feed')
	await learner.see('deck-feed-page')

	// Navigate to review
	await learner.click('sidebar-link--learn-lang-review')
	await learner.see('review-setup-page')

	// Navigate to search
	await learner.click('sidebar-link--learn-lang-search')
	await learner.see('search-page')

	// Navigate to contributions
	await learner.click('sidebar-link--learn-lang-contributions')
	await learner.see('contributions-page')
})

scene('learner switches between decks', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.see('decks-list-grid')

	// Go to Hindi deck
	await learner.click('deck-card-link-hin')
	await learner.see('deck-feed-page')

	// Go back to deck list
	await learner.click('back-to-decks-link')
	await learner.see('decks-list-grid')

	// Go to Tamil deck
	await learner.click('deck-card-link-tam')
	await learner.see('deck-feed-page')
})

scene('learner accesses profile from user menu', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')

	await learner.click('sidebar-user-menu-trigger')
	await learner.click('profile-menu-item')

	await learner.see('profile-page')
	await learner.seeText('Display Preferences')
})

scene('learner uses search functionality', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	await learner.click('sidebar-link--learn-lang-search')
	await learner.see('search-page')

	await learner.typeInto('search-input', 'hello')
	await learner.see('search-results')
})

// =============================================================================
// PHRASE REQUESTS
// =============================================================================

scene('learner creates a new phrase request', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/contributions')
	await learner.click('contributions-tab--requests')

	await learner.click('new-request-link')
	await learner.see('new-request-form')

	await learner.typeInto(
		'request-prompt-input',
		'How do I say "good morning" casually?'
	)
	await learner.click('post-request-button')

	await learner.see('toast-request-created')
	await learner.see('request-detail-page')
})

scene('learner edits their request', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/requests/:requestId')
	await learner.see('request-detail-page')

	await learner.click('update-request-button')
	await learner.see('edit-request-dialog')

	await learner.typeInto(
		'edit-request-prompt-input',
		'Updated: How do I say "good afternoon"?'
	)
	await learner.click('save-request-button')

	await learner.see('toast-request-updated')
	await learner.seeText('Updated: How do I say "good afternoon"?')
})

scene('learner deletes their request', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/requests/:requestId')
	await learner.see('request-detail-page')

	await learner.click('delete-request-button')
	await learner.see('delete-request-dialog')
	await learner.click('confirm-delete-button')

	await learner.see('toast-request-deleted')
	await learner.see('deck-feed-page')
})

scene('non-owner cannot edit or delete request', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/requests/:requestId')
	await learner.see('request-detail-page')

	// Edit and delete buttons should not be visible
	await learner.notSee('update-request-button')
	await learner.notSee('delete-request-button')
})

scene('learner copies comment permalink', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/requests/:requestId')
	await learner.see('comment-item')

	await learner.click('comment-context-menu-trigger')
	await learner.click('copy-link-menu-item')

	await learner.see('toast-link-copied')
})

// =============================================================================
// PLAYLISTS
// =============================================================================

scene('learner edits their playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.see('playlist-detail-page')

	await learner.click('update-playlist-button')
	await learner.see('edit-playlist-dialog')

	await learner.typeInto('playlist-title-input', 'Updated Playlist Title')
	await learner.typeInto('playlist-description-input', 'New description')
	await learner.typeInto(
		'playlist-href-input',
		'https://youtube.com/watch?v=test'
	)
	await learner.click('save-playlist-button')

	await learner.see('toast-playlist-updated')
	await learner.seeText('Updated Playlist Title')
})

scene('learner deletes their playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.see('playlist-detail-page')

	await learner.click('delete-playlist-button')
	await learner.see('delete-playlist-dialog')
	await learner.click('confirm-delete-button')

	await learner.see('toast-playlist-deleted')
	await learner.see('deck-feed-page')
})

scene('non-owner cannot manage playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.see('playlist-detail-page')

	await learner.notSee('update-playlist-button')
	await learner.notSee('delete-playlist-button')
	await learner.notSee('manage-phrases-button')
})

scene('learner adds phrase to playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.click('manage-phrases-button')

	await learner.see('manage-phrases-dialog')
	await learner.click('add-phrases-button')

	await learner.typeInto('phrase-search-input', 'test phrase')
	await learner.click('phrase-checkbox')
	await learner.click('add-flashcard-button')

	await learner.see('toast-phrase-added')
})

scene('learner removes phrase from playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.click('manage-phrases-button')

	await learner.see('manage-phrases-dialog')
	await learner.click('remove-phrase-button')

	await learner.see('toast-phrase-removed')
})

scene('learner reorders phrases in playlist', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/playlists/:playlistId')
	await learner.click('manage-phrases-button')

	await learner.see('manage-phrases-dialog')
	await learner.click('move-phrase-down-button')

	// Order should change (verified by inline assertion in component)
})

// =============================================================================
// FEED
// =============================================================================

scene(
	'learner views activity feed with requests, playlists, and phrases',
	async ({ actor }) => {
		const learner = await actor('learner')
		await loginAs(learner)

		await learner.openTo('/learn')
		await learner.click('deck-card-link-hin')

		await learner.see('deck-feed-page')
		await learner.see('feed-item-list')

		// Feed should show different content types
		await learner.see('feed-item-request')
		await learner.see('feed-item-playlist')
		await learner.see('feed-item-phrase')
	}
)

scene('learner switches to Popular tab on feed', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	await learner.see('deck-feed-page')
	await learner.click('feed-tab-popular')

	// Items should be sorted by popularity (verified by inline assertion)
	await learner.see('feed-item-list')
})

scene('learner upvotes a playlist in feed', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	await learner.see('feed-item-playlist')
	await learner.click('upvote-playlist-button')

	// Upvote count should increment (verified by inline assertion)
	await learner.seeText('1')

	// Click again to remove upvote
	await learner.click('upvote-playlist-button')
	await learner.seeText('0')
})

scene('feed loads more items on scroll', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	await learner.see('deck-feed-page')
	await learner.see('feed-item-list')

	// Scroll to bottom (API extension needed)
	await learner.scrollToBottom()

	// Should load more items or show load more button
	await learner.see('load-more-button')
	await learner.click('load-more-button')

	// More items should appear (verified by inline assertion)
})

// =============================================================================
// FRIENDS & CHAT
// =============================================================================

scene('learner views chat messages from a friend', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('sidebar-link--friends-chats')

	await learner.see('chats-page')
	await learner.see('friend-chat-list')

	// Click on a friend's chat
	await learner.click('friend-chat-link')

	await learner.see('chat-messages-container')
	await learner.see('chat-message-bubble')
})

scene('opening a chat marks messages as read', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('sidebar-link--friends-chats')

	await learner.see('chats-page')

	// Should see unread indicator
	await learner.see('unread-badge')

	// Open the chat
	await learner.click('friend-chat-link')

	await learner.see('chat-messages-container')

	// Unread badge should disappear (verified by inline assertion in component)
})

// =============================================================================
// REVIEW
// =============================================================================

scene('learner starts a review session', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn')
	await learner.click('deck-card-link-hin')

	await learner.click('sidebar-link--learn-lang-review')
	await learner.see('review-setup-page')

	// Should see review stats
	await learner.seeText('Total cards')
	await learner.see('start-review-button')

	await learner.click('start-review-button')
	await learner.see('review-session-page')
	await learner.see('flashcard')
})

scene('learner completes a review session', async ({ actor }) => {
	const learner = await actor('learner')
	await loginAs(learner)

	await learner.openTo('/learn/hin/review')
	await learner.click('start-review-button')

	await learner.see('review-session-page')
	await learner.see('flashcard')

	// Reveal answer
	await learner.click('reveal-answer-button')

	// Rate the card
	await learner.click('rating-good-button')

	// Continue until done (in real test, would loop)
	await learner.see('review-complete-page')
})

// =============================================================================
// LOGGED OUT NAVIGATION
// =============================================================================

scene('visitor can browse languages without logging in', async ({ actor }) => {
	const visitor = await actor('visitor')

	await visitor.openTo('/')
	await visitor.see('landing-page')

	await visitor.click('browse-languages-link')
	await visitor.see('browse-page')
	await visitor.see('language-card-list')

	// Click on a language
	await visitor.click('language-card-hin')
	await visitor.see('language-detail-page')
})

scene('visitor sees login prompt on protected pages', async ({ actor }) => {
	const visitor = await actor('visitor')

	await visitor.openTo('/learn')

	// Should see browse prompt for logged out users
	await visitor.see('logged-out-learn-page')
	await visitor.see('browse-languages-prompt')
	await visitor.see('login-link')
})
