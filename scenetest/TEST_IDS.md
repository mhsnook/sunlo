# Test IDs for Scenetest Scenes

This document lists all `data-testid` attributes needed to make the scene specs work.
Engineers should add these IDs to the corresponding components.

## API Extensions Assumed

The scene specs assume some API extensions beyond the current Scenetest core:

```typescript
// Methods used in scenes that may need implementation:
await user.seeId('test-id') // Wait for data-testid to be visible
await user.clickId('test-id') // Click element by data-testid
await user.typeInto('test-id', 'text') // Type into input by data-testid
await user.seeText('text') // Wait for text to be visible
await user.notSeeId('test-id') // Verify element is NOT visible
await user.scrollToBottom() // Scroll to bottom of page
await user.seeToast('success') // Wait for toast to appear AND disappear
await cast('role', { fixtures }) // Actor with test data fixtures
```

---

## Authentication & Navigation

| Test ID                         | Component/Location     | Description                                                   |
| ------------------------------- | ---------------------- | ------------------------------------------------------------- |
| `login-link`                    | Sidebar                | Link to login page for logged-out users                       |
| `login-form`                    | Login page             | The login form container                                      |
| `email-input`                   | Form fields            | Email input (use composition: `login-form email-input`)       |
| `password-input`                | Form fields            | Password input (use composition: `login-form password-input`) |
| `login-submit-button`           | Login form             | Form submit button                                            |
| `welcome-page`                  | Welcome route          | Welcome page container                                        |
| `community-norms-dialog`        | Welcome page           | Community norms intro dialog                                  |
| `affirm-community-norms-button` | Community norms dialog | Button to affirm norms                                        |
| `sunlo-welcome-explainer`       | Welcome page           | Welcome content after affirming                               |
| `go-to-decks-button`            | Welcome page           | Link to /learn                                                |
| `sidebar-user-menu-trigger`     | Sidebar                | User avatar/menu button                                       |
| `sidebar-signout-button`        | User menu              | Sign out button                                               |
| `profile-menu-item`             | User menu              | Link to profile                                               |

## Deck Management

| Test ID                       | Component/Location  | Description                                                   |
| ----------------------------- | ------------------- | ------------------------------------------------------------- |
| `decks-list-grid`             | Learn page          | Grid container for deck cards                                 |
| `deck-card-{lang}`            | Deck card           | Container for deck card (e.g., `deck-card-hin`)               |
| `deck-card-link-{lang}`       | Deck card           | Link to deck feed (e.g., `deck-card-link-hin`)                |
| `deck-switcher-button`        | Sidebar             | Button to open deck switcher                                  |
| `new-deck-menu-item`          | Deck switcher       | "New deck" option                                             |
| `add-deck-form`               | Add deck page       | Form container                                                |
| `language-selector-button`    | Add deck form       | Button to open language selector                              |
| `language-search-input`       | Language selector   | Search input for languages                                    |
| `language-option-{lang}`      | Language selector   | Option for language (e.g., `language-option-spa`)             |
| `start-learning-button`       | Add deck form       | Submit button                                                 |
| `deck-feed-page`              | Deck feed route     | Feed page container                                           |
| `top-right-context-menu`      | Navbar              | Context menu trigger                                          |
| `deck-settings-menu-item`     | Context menu        | Link to deck settings                                         |
| `deck-settings-page`          | Deck settings route | Settings page container                                       |
| `review-goal-option-{n}`      | Settings form       | Radio option for review goal (e.g., `review-goal-option-10`)  |
| `update-daily-goal-button`    | Settings form       | Button to save review goal                                    |
| `learning-goal-option-{type}` | Settings form       | Radio for learning goal (e.g., `learning-goal-option-family`) |
| `update-goal-button`          | Settings form       | Button to save learning goal                                  |
| `archive-deck-button`         | Settings page       | Button to archive deck                                        |
| `archive-confirmation-dialog` | Dialog              | Archive confirmation dialog                                   |
| `confirm-archive-button`      | Dialog              | Confirm archive button                                        |
| `back-to-all-decks-link`      | Settings page       | Link back to /learn                                           |
| `view-archived-decks-link`    | Learn page          | Link to archived decks                                        |
| `restore-deck-button`         | Settings page       | Button to restore archived deck                               |
| `restore-confirmation-dialog` | Dialog              | Restore confirmation dialog                                   |
| `confirm-restore-button`      | Dialog              | Confirm restore button                                        |

## Card Management

| Test ID                | Component/Location | Description                  |
| ---------------------- | ------------------ | ---------------------------- |
| `phrase-detail-page`   | Phrase route       | Phrase detail page container |
| `card-status-dropdown` | Phrase page        | Dropdown for card status     |
| `add-to-deck-option`   | Status dropdown    | "Add to deck" option         |
| `set-learned-option`   | Status dropdown    | "Set learned" option         |
| `ignore-card-option`   | Status dropdown    | "Ignore card" option         |
| `activate-card-option` | Status dropdown    | "Activate card" option       |

## Sidebar Navigation

| Test ID                                  | Component/Location | Description               |
| ---------------------------------------- | ------------------ | ------------------------- |
| `sidebar-link--learn-lang-feed`          | Sidebar            | Link to deck feed         |
| `sidebar-link--learn-lang-review`        | Sidebar            | Link to review            |
| `sidebar-link--learn-lang-search`        | Sidebar            | Link to search            |
| `sidebar-link--learn-lang-contributions` | Sidebar            | Link to contributions     |
| `sidebar-link--learn-lang-requests-new`  | Sidebar            | Link to new request       |
| `sidebar-link--friends-chats`            | Sidebar            | Link to chats             |
| `back-to-decks-link`                     | Sidebar            | Link back to /learn       |
| `friends-section`                        | Learn page         | Friends section container |
| `profile-page`                           | Profile route      | Profile page container    |
| `search-page`                            | Search route       | Search page container     |
| `search-input`                           | Search page        | Search text input         |
| `search-results`                         | Search page        | Search results container  |

## Phrase Requests

| Test ID                        | Component/Location  | Description                  |
| ------------------------------ | ------------------- | ---------------------------- |
| `contributions-page`           | Contributions route | Contributions page container |
| `contributions-tab--requests`  | Contributions page  | Tab for requests             |
| `contributions-tab--phrases`   | Contributions page  | Tab for phrases              |
| `new-request-link`             | Contributions page  | Link to create new request   |
| `new-request-form`             | New request page    | Request form container       |
| `request-prompt-input`         | Request form        | Textarea for prompt          |
| `post-request-button`          | Request form        | Submit button                |
| `request-detail-page`          | Request route       | Request detail container     |
| `update-request-button`        | Request page        | Edit button (owner only)     |
| `edit-request-dialog`          | Dialog              | Edit request dialog          |
| `edit-request-prompt-input`    | Edit dialog         | Textarea for prompt          |
| `save-request-button`          | Edit dialog         | Save button                  |
| `delete-request-button`        | Request page        | Delete button (owner only)   |
| `delete-request-dialog`        | Dialog              | Delete confirmation          |
| `confirm-delete-button`        | Dialog              | Confirm delete button        |
| `comment-item`                 | Request page        | Comment container            |
| `comment-context-menu-trigger` | Comment             | Context menu button          |
| `copy-link-menu-item`          | Context menu        | Copy link option             |

## Playlists

| Test ID                      | Component/Location | Description                        |
| ---------------------------- | ------------------ | ---------------------------------- |
| `playlist-detail-page`       | Playlist route     | Playlist detail container          |
| `update-playlist-button`     | Playlist page      | Edit button (owner only)           |
| `edit-playlist-dialog`       | Dialog             | Edit playlist dialog               |
| `playlist-title-input`       | Edit dialog        | Title input                        |
| `playlist-description-input` | Edit dialog        | Description textarea               |
| `playlist-href-input`        | Edit dialog        | URL input                          |
| `save-playlist-button`       | Edit dialog        | Save button                        |
| `delete-playlist-button`     | Playlist page      | Delete button (owner only)         |
| `delete-playlist-dialog`     | Dialog             | Delete confirmation                |
| `manage-phrases-button`      | Playlist page      | Manage phrases button (owner only) |
| `manage-phrases-dialog`      | Dialog             | Manage phrases dialog              |
| `add-phrases-button`         | Manage dialog      | Button to add phrases              |
| `phrase-search-input`        | Add phrases        | Search input                       |
| `phrase-checkbox`            | Add phrases        | Checkbox for phrase selection      |
| `add-flashcard-button`       | Add phrases        | Confirm add button                 |
| `remove-phrase-button`       | Manage dialog      | Remove phrase button               |
| `move-phrase-down-button`    | Manage dialog      | Reorder down button                |

## Feed

| Test ID                  | Component/Location | Description                   |
| ------------------------ | ------------------ | ----------------------------- |
| `feed-item-list`         | Feed page          | List container for feed items |
| `feed-item-request`      | Feed               | Request feed item             |
| `feed-item-playlist`     | Feed               | Playlist feed item            |
| `feed-item-phrase`       | Feed               | Phrase feed item              |
| `feed-phrase-link`       | Feed item          | Link to phrase detail         |
| `feed-phrase-link-{id}`  | Feed item          | Link with phrase ID           |
| `feed-tab-popular`       | Feed page          | Popular tab                   |
| `upvote-playlist-button` | Feed item          | Upvote button for playlist    |
| `load-more-button`       | Feed page          | Load more items button        |

## Chat

| Test ID                   | Component/Location | Description               |
| ------------------------- | ------------------ | ------------------------- |
| `chats-page`              | Chats route        | Chats page container      |
| `friend-chat-list`        | Chats page         | List of friend chats      |
| `friend-chat-link`        | Chat list          | Link to specific chat     |
| `unread-badge`            | Chat list item     | Unread message indicator  |
| `chat-messages-container` | Chat page          | Messages container        |
| `chat-message-bubble`     | Chat page          | Individual message bubble |

## Review

| Test ID                | Component/Location | Description             |
| ---------------------- | ------------------ | ----------------------- |
| `review-setup-page`    | Review route       | Review setup container  |
| `start-review-button`  | Review setup       | Button to start session |
| `review-session-page`  | Review session     | Active review container |
| `flashcard`            | Review session     | Flashcard component     |
| `reveal-answer-button` | Review session     | Button to show answer   |
| `rating-good-button`   | Review session     | "Good" rating button    |
| `review-complete-page` | Review session     | Completion screen       |

## Logged Out / Public

| Test ID                   | Component/Location | Description                               |
| ------------------------- | ------------------ | ----------------------------------------- |
| `landing-page`            | Home route         | Landing page container                    |
| `browse-languages-link`   | Landing page       | Link to browse                            |
| `browse-page`             | Browse route       | Browse page container                     |
| `language-card-list`      | Browse page        | List of language cards                    |
| `language-card-{lang}`    | Browse page        | Language card (e.g., `language-card-hin`) |
| `language-detail-page`    | Language route     | Language detail container                 |
| `logged-out-learn-page`   | Learn route        | Learn page for visitors                   |
| `browse-languages-prompt` | Learn page         | Prompt to browse languages                |

---

## Fixtures

The scenes reference test fixtures that would be set up before tests run:

| Fixture                       | Description                                 |
| ----------------------------- | ------------------------------------------- |
| `phrase-without-card`         | A phrase that's not in the user's deck      |
| `phrase-with-active-card`     | A phrase with an active card in user's deck |
| `owned-request`               | A request created by the test user          |
| `other-user-request`          | A request created by a different user       |
| `request-with-comment`        | A request with at least one comment         |
| `owned-playlist`              | A playlist created by the test user         |
| `other-user-playlist`         | A playlist created by a different user      |
| `owned-playlist-with-phrases` | User's playlist with some phrases           |
| `playlist-in-feed`            | A playlist visible in the feed              |
| `many-feed-items`             | Enough feed items to test pagination        |
| `unread-message`              | An unread chat message for the user         |
| `cards-due-for-review`        | Cards that are due for review               |

---

## Notes

1. **Existing test IDs**: Some test IDs already exist in the codebase (like `sidebar-link--friends-chats`). Check existing code before adding duplicates.

2. **Dynamic IDs**: IDs like `deck-card-{lang}` use template variables. In React:

   ```tsx
   <div data-testid={`deck-card-${lang}`}>
   ```

3. **Toasts**: Use generic `toast-success` and `toast-error` IDs. The `seeToast('success')` helper waits for the toast to appear AND disappear, preventing false positives from stale toasts.

4. **Inline Assertions**: Engineers should add `useTestEffect` hooks in components to verify state consistency between client collections and server data.
