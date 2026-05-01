# Test IDs for Scenetest Scenes

This document lists all DOM markers needed to make the scene specs work.
Engineers should add these attributes to the corresponding components.

## Selector conventions

Three attributes, each with a clear role:

| Situation                 | Attribute                             | Spec selector                   |
| ------------------------- | ------------------------------------- | ------------------------------- |
| One-of-a-kind element     | `data-testid="login-form"`            | `login-form`                    |
| List container            | `data-testid="decks-list-grid"`       | `decks-list-grid`               |
| Interactive element       | `data-testid="save-button"`           | `save-button`                   |
| Item inside a list        | `data-key={lang}`                     | `decks-list-grid hin`           |
| Action inside a list item | `data-testid="deck-tile"`             | `decks-list-grid hin deck-tile` |
| Items with no wrapper     | `data-name="tab" data-key="settings"` | `tab settings`                  |

### List items: container + `data-key`

Put `data-testid` on the **container** and bare `data-key` on each
**item**. The container provides type context; the key identifies the
instance.

```tsx
<div data-testid="decks-list-grid">
	{decks.map((deck) => (
		<div data-key={deck.lang}>
			<button data-testid="deck-tile">{deck.name}</button>
		</div>
	))}
</div>
```

```
- see decks-list-grid hin
- click decks-list-grid hin deck-tile
- notSee decks-list-grid spa
```

Only use `data-name` + `data-key` on items when the DOM has no
natural wrapper element to label.

---

## Authentication & Navigation

| Selector                        | Attribute   | Component/Location     | Description                             |
| ------------------------------- | ----------- | ---------------------- | --------------------------------------- |
| `login-link`                    | data-testid | Sidebar                | Link to login page for logged-out users |
| `login-form`                    | data-testid | Login page             | The login form container                |
| `signup-page`                   | data-testid | Signup page            | The signup card container               |
| `email-input`                   | data-testid | Form fields            | Email input                             |
| `password-input`                | data-testid | Form fields            | Password input                          |
| `login-submit-button`           | data-testid | Login form             | Form submit button                      |
| `welcome-page`                  | data-testid | Welcome route          | Welcome page container                  |
| `community-norms-dialog`        | data-testid | Welcome page           | Community norms intro dialog            |
| `affirm-community-norms-button` | data-testid | Community norms dialog | Button to affirm norms                  |
| `sunlo-welcome-explainer`       | data-testid | Welcome page           | Welcome content after affirming         |
| `go-to-decks-link`              | data-testid | Welcome page           | Link to /learn                          |
| `sidebar-user-menu-trigger`     | data-testid | Sidebar                | User avatar/menu button                 |
| `sidebar-signout-button`        | data-testid | User menu              | Sign out button                         |
| `profile-menu-item`             | data-testid | User menu              | Link to profile                         |

## Deck Management

| Selector                           | Attribute   | Component/Location  | Description                                                   |
| ---------------------------------- | ----------- | ------------------- | ------------------------------------------------------------- |
| `learn-page`                       | data-testid | Learn page          | Main container for authenticated learn page                   |
| `learn-welcome-header`             | data-testid | Learn page          | Welcome hero ("Welcome back, …")                              |
| `add-phrase-button`                | data-testid | Learn page          | Hero CTA linking to /learn/$lang/phrases/new                  |
| `review-ready-banner`              | data-testid | Learn page          | Banner showing cards ready for review                         |
| `start-review-button`              | data-testid | Review banner       | CTA to start the review session                               |
| `your-decks-section`               | data-testid | Learn page          | Section containing the deck tile grid                         |
| `decks-list-grid`                  | data-testid | Learn page          | Grid container for deck cards                                 |
| `decks-list-grid {lang}`           | data-key    | Deck card/tile      | Item inside grid (e.g. `decks-list-grid hin`)                 |
| `decks-list-grid {lang} deck-tile` | data-testid | Deck tile           | Button that opens the deck chooser dialog                     |
| `deck-tile-{lang}`                 | data-testid | Deck tile           | Compact deck tile on learn home                               |
| `deck-tile-dialog`                 | data-testid | Deck chooser        | Dialog surface opened from a deck tile                        |
| `start-practice-link`              | data-testid | Deck chooser        | "Daily practice" link to /learn/$lang/review                  |
| `deck-link`                        | data-testid | Deck chooser / card | "Browse deck" link to /learn/$lang                            |
| `add-deck-tile`                    | data-testid | Learn page          | "+ Start a new deck" tile                                     |
| `friends-feed-section`             | data-testid | Learn page          | Section containing the friends-activity snippet               |
| `friends-feed-snippet`             | data-testid | Learn page          | Wrapper around preview friend-activity items                  |
| `friends-feed-empty`               | data-testid | Friends feed        | Shown when the user has no connected friends                  |
| `friends-feed-quiet`               | data-testid | Friends feed        | Shown when friends exist but have posted nothing              |
| `view-friends-feed-link`           | data-testid | Friends feed        | Link to the full friends feed for the focus deck              |
| `deck-switcher-button`             | data-testid | Sidebar             | Button to open deck switcher                                  |
| `new-deck-menu-item`               | data-testid | Deck switcher       | "New deck" option                                             |
| `add-deck-form`                    | data-testid | Add deck page       | Form container                                                |
| `language-selector-button`         | data-testid | Add deck form       | Button to open language selector                              |
| `language-search-input`            | data-testid | Language selector   | Search input for languages                                    |
| `language-options`                 | data-testid | Language selector   | Container for language options                                |
| `language-options {lang}`          | data-key    | Language selector   | Language option item (e.g. `language-options spa`)            |
| `start-learning-button`            | data-testid | Add deck form       | Submit button                                                 |
| `deck-feed-page`                   | data-testid | Deck feed route     | Feed page container                                           |
| `top-right-context-menu`           | data-testid | Navbar              | Context menu trigger                                          |
| `deck-settings-menu-item`          | data-testid | Context menu        | Link to deck settings                                         |
| `deck-settings-page`               | data-testid | Deck settings route | Settings page container                                       |
| `dismiss-deck-settings-intro`      | data-testid | Deck settings intro | Button to dismiss settings intro sheet                        |
| `review-goal-options`              | data-testid | Settings form       | Container for review goal radios                              |
| `review-goal-options {n}`          | data-key    | Settings form       | Radio for review goal (e.g. `review-goal-options 10`)         |
| `update-daily-goal-button`         | data-testid | Settings form       | Button to save review goal                                    |
| `learning-goal-options`            | data-testid | Settings form       | Container for learning goal radios                            |
| `learning-goal-options {type}`     | data-key    | Settings form       | Radio for learning goal (e.g. `learning-goal-options family`) |
| `update-goal-button`               | data-testid | Settings form       | Button to save learning goal                                  |
| `archive-deck-button`              | data-testid | Settings page       | Button to archive deck                                        |
| `archive-confirmation-dialog`      | data-testid | Dialog              | Archive confirmation dialog                                   |
| `confirm-archive-button`           | data-testid | Dialog              | Confirm archive button                                        |
| `back-to-all-decks-link`           | data-testid | Settings page       | Link back to /learn                                           |
| `view-archived-decks-link`         | data-testid | Learn page          | Link to archived decks                                        |
| `restore-deck-button`              | data-testid | Settings page       | Button to restore archived deck                               |
| `restore-confirmation-dialog`      | data-testid | Dialog              | Restore confirmation dialog                                   |
| `confirm-restore-button`           | data-testid | Dialog              | Confirm restore button                                        |

## Card Management

| Selector               | Attribute   | Component/Location | Description                            |
| ---------------------- | ----------- | ------------------ | -------------------------------------- |
| `phrase-detail-page`   | data-testid | Phrase route       | Phrase detail page container           |
| `card-status-dropdown` | data-testid | Phrase page        | Dropdown for card status               |
| `add-to-deck-option`   | data-testid | Status dropdown    | "Add to deck" option                   |
| `set-learned-option`   | data-testid | Status dropdown    | "Set learned" option                   |
| `ignore-card-option`   | data-testid | Status dropdown    | "Ignore card" option                   |
| `activate-card-option` | data-testid | Status dropdown    | "Activate card" option                 |
| `add-phrase-page`      | data-testid | Add phrase route   | Container for /learn/$lang/phrases/new |
| `bulk-add-link`        | data-testid | Add phrase page    | Link to bulk-add page                  |
| `bulk-add-page`        | data-testid | Bulk add route     | Container for /learn/$lang/bulk-add    |

## Sidebar Navigation

| Selector                                 | Attribute   | Component/Location | Description               |
| ---------------------------------------- | ----------- | ------------------ | ------------------------- |
| `sidebar-link--learn-lang-feed`          | data-testid | Sidebar            | Link to deck feed         |
| `sidebar-link--learn-lang-review`        | data-testid | Sidebar            | Link to review            |
| `sidebar-link--learn-lang-search`        | data-testid | Sidebar            | Link to search            |
| `sidebar-link--learn-lang-contributions` | data-testid | Sidebar            | Link to contributions     |
| `sidebar-link--learn-lang-requests-new`  | data-testid | Sidebar            | Link to new request       |
| `sidebar-link--friends-chats`            | data-testid | Sidebar            | Link to chats             |
| `back-to-decks-link`                     | data-testid | Sidebar            | Link back to /learn       |
| `friends-section`                        | data-testid | Learn page         | Friends section container |
| `profile-page`                           | data-testid | Profile route      | Profile page container    |
| `search-page`                            | data-testid | Search route       | Search page container     |
| `search-input`                           | data-testid | Search page        | Search text input         |
| `search-results`                         | data-testid | Search page        | Search results container  |

## Phrase Requests

| Selector                       | Attribute   | Component/Location  | Description                                                                                        |
| ------------------------------ | ----------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `contributions-page`           | data-testid | Contributions route | Contributions page container                                                                       |
| `contributions-tab--requests`  | data-testid | Contributions page  | Tab for requests                                                                                   |
| `contributions-tab--phrases`   | data-testid | Contributions page  | Tab for phrases                                                                                    |
| `contributions-tab--playlists` | data-testid | Contributions page  | Tab for playlists                                                                                  |
| `contributions-tab--answers`   | data-testid | Contributions page  | Tab for answers                                                                                    |
| `contributions-tab--comments`  | data-testid | Contributions page  | Tab for comments                                                                                   |
| `contributions-comment-item`   | data-testid | Comments tab        | Comment card on the comments tab (use with `data-key={commentId}`)                                 |
| `new-request-link`             | data-testid | Contributions page  | Link to create new request                                                                         |
| `new-request-form`             | data-testid | New request page    | Request form container                                                                             |
| `request-prompt-input`         | data-testid | Request form        | Textarea for prompt                                                                                |
| `post-request-button`          | data-testid | Request form        | Submit button                                                                                      |
| `request-detail-page`          | data-testid | Request route       | Request detail container                                                                           |
| `request-item`                 | data-testid | Request list        | A request list item (own user)                                                                     |
| `other-user-request-item`      | data-testid | Request list        | A request by another user                                                                          |
| `update-request-button`        | data-testid | Request page        | Edit button (owner only)                                                                           |
| `edit-request-dialog`          | data-testid | Dialog              | Edit request dialog                                                                                |
| `edit-request-prompt-input`    | data-testid | Edit dialog         | Textarea for prompt                                                                                |
| `save-request-button`          | data-testid | Edit dialog         | Save button                                                                                        |
| `delete-request-button`        | data-testid | Request page        | Delete button (owner only)                                                                         |
| `delete-request-dialog`        | data-testid | Dialog              | Delete confirmation                                                                                |
| `confirm-delete-button`        | data-testid | Dialog              | Confirm delete button                                                                              |
| `comment-item`                 | data-name   | Request page        | Comment container (use with data-key for a specific comment)                                       |
| `show-replies-button`          | data-name   | Comment item        | Toggle to expand/collapse the reply subthread (select via `comment-item {id} show-replies-button`) |
| `add-reply-inline`             | data-name   | Comment subthread   | Inline prompt to open the reply dialog (select via `comment-item {id} add-reply-inline`)           |
| `comment-context-menu-trigger` | data-testid | Comment             | Context menu button                                                                                |
| `copy-link-menu-item`          | data-testid | Context menu        | Copy link option                                                                                   |

## Playlists

| Selector                     | Attribute   | Component/Location | Description                        |
| ---------------------------- | ----------- | ------------------ | ---------------------------------- |
| `playlist-detail-page`       | data-testid | Playlist route     | Playlist detail container          |
| `update-playlist-button`     | data-testid | Playlist page      | Edit button (owner only)           |
| `edit-playlist-dialog`       | data-testid | Dialog             | Edit playlist dialog               |
| `playlist-title-input`       | data-testid | Edit dialog        | Title input                        |
| `playlist-description-input` | data-testid | Edit dialog        | Description textarea               |
| `playlist-href-input`        | data-testid | Edit dialog        | URL input                          |
| `save-playlist-button`       | data-testid | Edit dialog        | Save button                        |
| `delete-playlist-button`     | data-testid | Playlist page      | Delete button (owner only)         |
| `delete-playlist-dialog`     | data-testid | Dialog             | Delete confirmation                |
| `manage-phrases-button`      | data-testid | Playlist page      | Manage phrases button (owner only) |
| `manage-phrases-dialog`      | data-testid | Dialog             | Manage phrases dialog              |
| `add-phrases-button`         | data-testid | Manage dialog      | Button to add phrases              |
| `phrase-search-input`        | data-testid | Add phrases        | Search input                       |
| `phrase-checkbox`            | data-testid | Add phrases        | Checkbox for phrase selection      |
| `add-flashcard-button`       | data-testid | Add phrases        | Confirm add button                 |
| `remove-phrase-button`       | data-testid | Manage dialog      | Remove phrase button               |
| `move-phrase-down-button`    | data-testid | Manage dialog      | Reorder down button                |

## Feed

| Selector                   | Attribute   | Component/Location | Description                   |
| -------------------------- | ----------- | ------------------ | ----------------------------- |
| `feed-item-list`           | data-testid | Feed page          | List container for feed items |
| `feed-item-request`        | data-name   | Feed               | Request feed item             |
| `feed-item-playlist`       | data-name   | Feed               | Playlist feed item            |
| `feed-item-phrase`         | data-name   | Feed               | Phrase feed item              |
| `other-user-playlist-item` | data-testid | Feed               | Playlist by another user      |
| `feed-phrase-link`         | data-testid | Feed item          | Link to phrase detail         |
| `feed-tab-popular`         | data-testid | Feed page          | Popular tab                   |
| `upvote-playlist-button`   | data-testid | Feed item          | Upvote button for playlist    |
| `load-more-button`         | data-testid | Feed page          | Load more items button        |

## Chat

| Selector                  | Attribute   | Component/Location | Description               |
| ------------------------- | ----------- | ------------------ | ------------------------- |
| `chats-page`              | data-testid | Chats route        | Chats page container      |
| `friend-chat-list`        | data-testid | Chats page         | List of friend chats      |
| `friend-chat-link`        | data-testid | Chat list          | Link to specific chat     |
| `unread-badge`            | data-testid | Chat list item     | Unread message indicator  |
| `chat-messages-container` | data-testid | Chat page          | Messages container        |
| `chat-message-bubble`     | data-testid | Chat page          | Individual message bubble |

## Friends / Invite

| Selector             | Attribute   | Component/Location | Description                                  |
| -------------------- | ----------- | ------------------ | -------------------------------------------- |
| `invite-friend-page` | data-testid | Invite route       | Invite page container                        |
| `invite-qr-card`     | data-testid | Invite page        | Card wrapping the QR code section            |
| `invite-qr-code`     | data-testid | Invite page        | QR code element encoding the signup referral |

## Review

| Selector               | Attribute   | Component/Location | Description             |
| ---------------------- | ----------- | ------------------ | ----------------------- |
| `review-setup-page`    | data-testid | Review route       | Review setup container  |
| `start-review-button`  | data-testid | Review setup       | Button to start session |
| `review-session-page`  | data-testid | Review session     | Active review container |
| `flashcard`            | data-testid | Review session     | Flashcard component     |
| `reveal-answer-button` | data-testid | Review session     | Button to show answer   |
| `rating-good-button`   | data-testid | Review session     | "Good" rating button    |
| `review-complete-page` | data-testid | Review session     | Completion screen       |

## Logged Out / Public

| Selector                    | Attribute   | Component/Location | Description                                        |
| --------------------------- | ----------- | ------------------ | -------------------------------------------------- |
| `landing-page`              | data-testid | Home route         | Landing page container                             |
| `browse-languages-link`     | data-testid | Landing page       | Link to browse                                     |
| `browse-page`               | data-testid | Browse route       | Browse page container                              |
| `language-card-list`        | data-testid | Browse page        | List of language cards                             |
| `language-card-list {lang}` | data-key    | Browse page        | Language card item (e.g. `language-card-list hin`) |
| `language-detail-page`      | data-testid | Language route     | Language detail container                          |
| `logged-out-learn-page`     | data-testid | Learn route        | Learn page for visitors                            |
| `browse-languages-prompt`   | data-testid | Learn page         | Prompt to browse languages                         |

## Notifications

| Selector                    | Attribute   | Component/Location  | Description                             |
| --------------------------- | ----------- | ------------------- | --------------------------------------- |
| `notification-bell`         | data-testid | Navbar              | Bell icon link to /notifications        |
| `notification-badge`        | data-testid | Notification bell   | Unread count badge on bell              |
| `notifications-page`        | data-testid | Notifications route | Notifications page container            |
| `notifications-empty-state` | data-testid | Notifications route | Empty state when no notifications exist |
| `notification-item`         | data-testid | Notification list   | Individual notification row             |
| `mark-all-read-button`      | data-testid | Notifications page  | "Mark all as read" button               |

## Review Answer Mode

| Selector                           | Attribute   | Component/Location | Description                           |
| ---------------------------------- | ----------- | ------------------ | ------------------------------------- |
| `review-answer-mode-radio`         | data-testid | Deck settings      | Radio group for answer mode selection |
| `review-answer-mode-2-buttons`     | data-testid | Radio group        | Option for 2-button mode              |
| `review-answer-mode-4-buttons`     | data-testid | Radio group        | Option for 4-button mode              |
| `update-review-answer-mode-button` | data-testid | Deck settings      | Save button for answer mode           |
| `clear-review-answer-mode-button`  | data-testid | Deck settings      | Clear deck override button            |
| `rating-again-button`              | data-testid | Review card        | "Again" / "Try Again" button          |
| `rating-hard-button`               | data-testid | Review card        | "Hard" button (4-button mode only)    |
| `rating-good-button`               | data-testid | Review card        | "Good" / "Correct!" button            |
| `rating-easy-button`               | data-testid | Review card        | "Easy" button (4-button mode only)    |

## Display Preferences

| Selector                       | Attribute   | Component/Location | Description                            |
| ------------------------------ | ----------- | ------------------ | -------------------------------------- |
| `display-preferences-page`     | data-testid | Profile page       | Display preferences section container  |
| `font-preference-default`      | data-testid | Display prefs      | Default font radio option              |
| `font-preference-dyslexic`     | data-testid | Display prefs      | OpenDyslexic font radio option         |
| `review-answer-mode-2-buttons` | data-testid | Display prefs      | 2-button mode option (profile-level)   |
| `review-answer-mode-4-buttons` | data-testid | Display prefs      | 4-button mode option (profile-level)   |
| `upvote-comment-button`        | data-testid | Comment item       | Upvote button on a comment             |
| `phrase-checkbox`              | data-testid | Phrase picker      | Checkbox for selecting a phrase        |
| `add-selected-phrases-button`  | data-testid | Phrase picker      | Confirm button to add selected phrases |

## Comments & Answers

| Selector                    | Attribute   | Component/Location  | Description                           |
| --------------------------- | ----------- | ------------------- | ------------------------------------- |
| `add-comment-button`        | data-testid | Request detail page | Button to open comment dialog         |
| `add-comment-dialog`        | data-testid | Dialog              | Add comment dialog container          |
| `comment-content-input`     | data-testid | Comment dialog      | Textarea for comment content          |
| `submit-comment-button`     | data-testid | Comment dialog      | Submit comment button                 |
| `reply-to-comment-button`   | data-testid | Comment item        | Reply button on a comment             |
| `comment-reply`             | data-testid | Comment thread      | A reply nested under a parent comment |
| `comment-phrase-link-badge` | data-testid | Comment item        | Badge showing linked phrase           |
| `attach-phrase-button`      | data-testid | Comment dialog      | Button to attach a phrase to comment  |
| `upvote-request-button`     | data-testid | Request detail page | Upvote button on request              |

## Playlists (HIN/KAN)

| Selector                     | Attribute   | Component/Location | Description                    |
| ---------------------------- | ----------- | ------------------ | ------------------------------ |
| `playlist-list`              | data-testid | Playlists page     | List container for playlists   |
| `playlist-item`              | data-testid | Playlists list     | Individual playlist card       |
| `playlist-phrase-list`       | data-testid | Playlist detail    | List of phrases in a playlist  |
| `new-playlist-form`          | data-testid | New playlist page  | Create playlist form container |
| `playlist-title-input`       | data-testid | New playlist form  | Title input for new playlist   |
| `playlist-description-input` | data-testid | New playlist form  | Description input              |
| `create-playlist-button`     | data-testid | New playlist form  | Submit button for new playlist |
| `upvote-playlist-button`     | data-testid | Playlist detail    | Upvote button on playlist      |

---

## Toasts

Toast selectors use `seeToast` in spec files, which waits for the
element to appear and then disappear:

| Selector                 | Description                   |
| ------------------------ | ----------------------------- |
| `toast-deck-created`     | Deck created confirmation     |
| `toast-settings-updated` | Settings saved confirmation   |
| `toast-deck-archived`    | Deck archived confirmation    |
| `toast-deck-restored`    | Deck restored confirmation    |
| `toast-phrase-added`     | Phrase added to deck/playlist |
| `toast-phrase-removed`   | Phrase removed from playlist  |
| `toast-status-updated`   | Card status changed           |
| `toast-request-created`  | Request created               |
| `toast-request-updated`  | Request edited                |
| `toast-request-deleted`  | Request deleted               |
| `toast-playlist-updated` | Playlist edited               |
| `toast-playlist-deleted` | Playlist deleted              |
| `toast-link-copied`      | Link copied to clipboard      |

---

## Onboarding & Profile Creation

| Selector              | Attribute   | Component/Location                 | Description                                |
| --------------------- | ----------- | ---------------------------------- | ------------------------------------------ |
| `username-input`      | data-testid | `components/fields/username-field` | Username input on the getting-started form |
| `save-profile-button` | data-testid | `routes/_user/getting-started.tsx` | Submit button on the profile creation form |

## Chat previews

| Selector                            | Attribute   | Component/Location                          | Description                                   |
| ----------------------------------- | ----------- | ------------------------------------------- | --------------------------------------------- |
| `chat-request-preview`              | data-testid | `routes/_user/friends/-request-preview.tsx` | Link wrapping a shared request bubble in chat |
| `chat-request-preview {request_id}` | data-key    | same                                        | Individual preview keyed by request id        |

## Inline phrase creator (comment dialog, chat recommend)

| Selector                        | Attribute   | Component/Location                             | Description                           |
| ------------------------------- | ----------- | ---------------------------------------------- | ------------------------------------- |
| `create-new-phrase-button`      | data-testid | `components/comments/comment-dialog.tsx`       | Opens the inline phrase creator panel |
| `inline-phrase-creator`         | data-testid | `components/phrases/inline-phrase-creator.tsx` | Inline phrase creator container       |
| `inline-phrase-text-input`      | data-testid | same                                           | Phrase text input                     |
| `inline-translation-text-input` | data-testid | same                                           | Translation text input                |
| `inline-phrase-submit-button`   | data-testid | same                                           | Submit button for creating the phrase |

## Deck stats badges

| Selector                   | Attribute   | Component/Location            | Description                                                |
| -------------------------- | ----------- | ----------------------------- | ---------------------------------------------------------- |
| `badge-count-reviews-7d`   | data-testid | `components/stats-badges.tsx` | Shown when deck has reviews in the last 7 days             |
| `badge-no-reviews-7d`      | data-testid | `components/stats-badges.tsx` | Shown when deck has zero reviews this week                 |
| `badge-most-recent-review` | data-testid | `components/stats-badges.tsx` | Shown only when `most_recent_review_at` is non-null (#156) |

## Admin Phrase Management

| Selector                       | Purpose                                |
| ------------------------------ | -------------------------------------- |
| `admin-gear-link`              | Gear icon on phrase card (admin only)  |
| `admin-phrases-page`           | Admin phrases layout wrapper           |
| `admin-phrases-table`          | Phrases table/list on admin index page |
| `admin-phrase-detail`          | Admin phrase detail page wrapper       |
| `admin-phrase-detail-link`     | Link to phrase detail from table row   |
| `admin-not-authorized-warning` | Warning callout for non-admin users    |
| `admin-archive-button`         | Archive phrase button on detail page   |
| `admin-unarchive-button`       | Restore archived phrase button         |
