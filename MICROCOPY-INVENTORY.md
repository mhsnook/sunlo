# Microcopy Inventory & Design System Review

This document inventories all user-facing action labels, button text, link text, and icons across the Sunlo codebase, identifies inconsistencies, and recommends consolidations.

---

## Part 1: The `links.ts` System (Name vs Title)

`hooks/links.ts` already provides a `name` (short, icon-adjacent) and `title` (longer, standalone) for nav links. This is the closest thing to a microcopy registry today. Here's the full inventory:

| Route Key                    | `name` (with icon) | `title` (standalone)    | Icon                 | Notes                                    |
| ---------------------------- | ------------------ | ----------------------- | -------------------- | ---------------------------------------- |
| `/`                          | Home               | _(none)_                | `Newspaper`          |                                          |
| `/friends`                   | Friends            | Friends                 | `HeartHandshake`     | name/title identical                     |
| `/friends/requests`          | Requests           | Friend Requests         | `HandHeart`          |                                          |
| `/friends/chats`             | Chats              | Chats                   | `MessagesSquare`     | name/title identical                     |
| `/friends/search`            | Search             | Search Profiles         | `Search`             |                                          |
| `/friends/invite`            | Invite             | Invite to Sunlo         | `Share`              |                                          |
| `/learn`                     | Home               | All Decks               | `Home`               |                                          |
| `/learn/browse`              | Browse             | Browse Library          | `Compass`            |                                          |
| `/learn/add-deck`            | Deck               | Start a New Deck        | `HeartPlus`          | "Deck" is vague as a name                |
| `/learn/contributions`       | Contributions      | Your Contributions      | `CircleStar`         |                                          |
| `/learn/browse/charts`       | Charts             | Library Data            | `BarChart3`          |                                          |
| `/learn/quick-search`        | Search             | Quick Search            | `Search`             |                                          |
| `/login`                     | Log in             | Sign In                 | `LogIn`              | **Inconsistency: "Log in" vs "Sign In"** |
| `/privacy-policy`            | Privacy Policy     | _(none)_                | `FileText`           |                                          |
| `/profile`                   | Profile            | View Profile            | `UserPen`            |                                          |
| `/profile/change-email`      | Update Email       | Update Account Email    | `Mail`               |                                          |
| `/profile/change-password`   | Update Password    | Update Password         | `Lock`               | name/title identical                     |
| `/signup`                    | Sign up            | Get Started             | `UserPlus`           |                                          |
| `/learn/$lang`               | Home               | {Language} Home         | `HouseHeart`         |                                          |
| `/learn/$lang/search`        | Search             | Quick Search {Language} | `Search`             |                                          |
| `/learn/$lang/stats`         | Stats              | My Review Stats         | `ChartBarDecreasing` |                                          |
| `/learn/$lang/deck-settings` | Settings           | Deck Settings           | `Settings`           |                                          |
| `/learn/$lang/review`        | Review             | Daily Review            | `Rocket`             |                                          |
| `/learn/$lang/feed`          | Feed               | {Language} Feed         | `Logs`               |                                          |
| `/learn/$lang/phrases/new`   | Phrase             | Add a Phrase            | `MessageSquareQuote` |                                          |
| `/learn/$lang/contributions` | Contributions      | My Contributions        | `CircleStar`         |                                          |
| `/learn/$lang/requests/new`  | Request            | Request a Phrase        | `MessageCircleHeart` |                                          |
| `/learn/$lang/playlists`     | Playlists          | {Language} Playlists    | `Logs`               | **Same icon as Feed**                    |

---

## Part 2: Core Action Concepts (Consolidation Table)

Below are the major user actions grouped by concept. Each row shows how the same action is currently labeled across contexts, and a recommended standard.

### A. Card/Phrase → Deck Actions

This is the most complex microcopy area, with the most variants.

| Context                             | Current Label                                        | Icon                                   | File:Line                            |
| ----------------------------------- | ---------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| Dropdown trigger (card in deck)     | `Active` / `Learned` / `Skipped`                     | `Bookmark`/`BookmarkCheck`/`BookmarkX` | `card-status-dropdown.tsx:46-90`     |
| Dropdown trigger (card not in deck) | `Not in deck`                                        | `BookmarkPlus`                         | `card-status-dropdown.tsx:76`        |
| Dropdown action (add)               | `Add to deck`                                        | `BookmarkPlus`                         | `card-status-dropdown.tsx:78`        |
| Dropdown action (activate)          | `Activate card`                                      | `Bookmark`                             | `card-status-dropdown.tsx:49`        |
| Dropdown action (skip)              | `Ignore card`                                        | `BookmarkX`                            | `card-status-dropdown.tsx:70`        |
| Dropdown action (learned)           | `Set "learned"`                                      | `BookmarkCheck`                        | `card-status-dropdown.tsx:62`        |
| Heart toggle (add)                  | _(icon only)_                                        | `Bookmark`                             | `card-status-dropdown.tsx:292-308`   |
| Heart toggle aria-label (add)       | "Learn this phrase (add to your active deck)"        | —                                      | `card-status-dropdown.tsx:306`       |
| Heart toggle aria-label (remove)    | "Skip this phrase (remove it from your active deck)" | —                                      | `card-status-dropdown.tsx:305`       |
| Playlist page CTA                   | `Add all {n} flashcards`                             | `HeartPlus`                            | `$lang.playlists.$playlistId.tsx:46` |
| Review context menu                 | `I've learned this`                                  | `BookmarkCheck`                        | `review-single-card.tsx:268`         |
| Review context menu                 | `Skip this card`                                     | `BookmarkX`                            | `review-single-card.tsx:275`         |
| Toast (update)                      | `Updated card status to "{status}"`                  | —                                      | `card-status-dropdown.tsx:178`       |
| Toast (add)                         | `Added this phrase to your deck`                     | —                                      | `card-status-dropdown.tsx:181`       |

**Inconsistencies:**

- "Ignore card" vs "Skip this card" vs "Skipped" (same action, three labels)
- "Activate card" vs "Active" vs "Learn this phrase" (same action)
- "Add to deck" (dropdown) vs "Learn this phrase (add to your active deck)" (heart) vs "Add all N flashcards" (playlist)
- "Set 'learned'" vs "I've learned this" (same action)
- `Bookmark` icon family for deck status vs `HeartPlus` for playlist bulk-add

**Recommended standard:**

| Action           | With Icon (short) | Without Icon (long)            | Icon                   | Status Label |
| ---------------- | ----------------- | ------------------------------ | ---------------------- | ------------ |
| Add to deck      | `+ Add to deck`   | "Add this phrase to your deck" | `BookmarkPlus`         | —            |
| Card is active   | `Active`          | "In your active deck"          | `Bookmark` (filled)    | Active       |
| Mark learned     | `Learned`         | "Mark as learned"              | `BookmarkCheck`        | Learned      |
| Skip/ignore      | `Skip`            | "Skip this phrase"             | `BookmarkX`            | Skipped      |
| Not in deck      | `Not in deck`     | "Not in your deck yet"         | `BookmarkPlus` (faded) | —            |
| Remove from deck | `Remove`          | "Remove from your deck"        | `BookmarkX`            | —            |

---

### B. Create Content Actions

| Context              | Current Label                     | Icon                 | File:Line                             |
| -------------------- | --------------------------------- | -------------------- | ------------------------------------- |
| Nav link             | `Phrase`                          | `MessageSquareQuote` | `links.ts:252`                        |
| Nav link title       | `Add a Phrase`                    | `MessageSquareQuote` | `links.ts:253`                        |
| Plus menu            | `New Phrase`                      | `MessageSquareQuote` | `plus-menu.tsx:43`                    |
| Submit button        | `Save and add another`            | `NotebookPen`        | `$lang.phrases.new.tsx:443`           |
| Stats page link      | `Add a phrase`                    | `MessageSquareQuote` | `$lang.stats.tsx:168`                 |
| Review complete link | `Add New Phrase`                  | `Plus`               | `when-review-complete-screen.tsx:169` |
| Inline creator       | _(form submit)_                   | —                    | `inline-phrase-creator.tsx`           |
| Bulk add submit      | `Save All Phrases ({n})`          | —                    | `$lang.bulk-add.tsx:357`              |
| Nav link             | `Request`                         | `MessageCircleHeart` | `links.ts:270`                        |
| Nav link title       | `Request a Phrase`                | `MessageCircleHeart` | `links.ts:271`                        |
| Plus menu            | `New Request`                     | `MessageCircleHeart` | `plus-menu.tsx:33`                    |
| Submit button        | `Post Request`                    | —                    | `$lang.requests.new.tsx:182`          |
| Feed empty CTA       | `Post a request for a new phrase` | —                    | `$lang.feed.tsx:204`                  |
| Feed empty CTA       | `Post a request`                  | —                    | `$lang.feed.tsx:308`                  |
| Stats page link      | `Request a phrase`                | `MessageCircleHeart` | `$lang.stats.tsx:180`                 |
| Nav link             | _(none)_                          | `ListMusic`          | —                                     |
| Plus menu            | `New Playlist`                    | `ListMusic`          | `plus-menu.tsx:52`                    |
| Submit button        | `Create Playlist`                 | —                    | `$lang.playlists.new.tsx:352`         |
| Playlists index      | `Create playlist`                 | `Plus`               | `$lang.playlists.index.tsx`           |

**Inconsistencies:**

- "Add a Phrase" vs "New Phrase" vs "Add New Phrase" vs "Save and add another"
- "Request a Phrase" vs "New Request" vs "Post Request" vs "Post a request for a new phrase" vs "Post a request"
- "New Playlist" vs "Create Playlist" vs "Create playlist" (capitalization)
- Different icons for same action: `Plus` vs `MessageSquareQuote` vs `NotebookPen` for phrase creation

**Recommended standard:**

| Action   | Nav name   | Nav title           | Plus menu      | Submit button     | Empty-state CTA         |
| -------- | ---------- | ------------------- | -------------- | ----------------- | ----------------------- |
| Phrase   | `Phrase`   | `Add a Phrase`      | `New Phrase`   | `Save Phrase`     | "Add a new phrase"      |
| Request  | `Request`  | `Post a Request`    | `New Request`  | `Post Request`    | "Post a new request"    |
| Playlist | `Playlist` | `Create a Playlist` | `New Playlist` | `Create Playlist` | "Create a new playlist" |

---

### C. Share / Send Actions

| Context                 | Current Label                | Icon    | File:Line                       |
| ----------------------- | ---------------------------- | ------- | ------------------------------- |
| Native share (generic)  | `Share`                      | `Share` | `native-share-button.tsx:28`    |
| Share phrase            | `Share phrase`               | `Share` | `share-phrase-button.tsx:37`    |
| Share request           | `Share request`              | `Share` | `share-request-button.tsx:43`   |
| Share playlist          | `Share playlist`             | `Share` | `share-playlist-button.tsx:30`  |
| Copy link (generic)     | `Copy Link`                  | `Copy`  | `copy-link-button.tsx:21`       |
| Comment menu share      | `Share`                      | `Share` | `comment-context-menu.tsx:75`   |
| Comment menu copy       | `Copy link`                  | `Link`  | `comment-context-menu.tsx:83`   |
| Send phrase to friend   | `Send to {n} friend(s)`      | `Send`  | `send-phrase-to-friend.tsx:88`  |
| Send request to friend  | `Send to {n} friend(s)`      | `Send`  | `send-request-to-friend.tsx:73` |
| Send playlist to friend | _(same pattern)_             | `Send`  | `send-playlist-to-friend.tsx`   |
| Send email invite       | `Send`                       | `Send`  | `invite-by-email-form.tsx:64`   |
| Nav link for invite     | `Invite` / `Invite to Sunlo` | `Share` | `links.ts:85`                   |

**This is mostly consistent!** The `Share` / `Send` / `Copy` distinction works well. Minor note:

- `Invite` nav link uses `Share` icon, which could be confused with actual share. Consider `UserPlus` or `Mail`.

---

### D. Edit / Update / Save Actions

| Context                   | Current Label                                                     | Icon     | File:Line                        |
| ------------------------- | ----------------------------------------------------------------- | -------- | -------------------------------- |
| Update request trigger    | _(icon only)_                                                     | `Edit`   | `update-request-dialog.tsx:55`   |
| Update playlist trigger   | _(icon only)_                                                     | `Edit`   | `update-playlist-dialog.tsx:111` |
| Update comment trigger    | _(icon only)_                                                     | `Edit`   | `update-comment-dialog.tsx:53`   |
| Edit tags trigger         | _(icon only)_                                                     | `Pencil` | `add-tags.tsx:110`               |
| Edit translations trigger | _(icon only)_                                                     | `Pencil` | `add-translations.tsx:104`       |
| Save (request dialog)     | `Save`                                                            | —        | `update-request-dialog.tsx:79`   |
| Save (playlist dialog)    | `Save`                                                            | —        | `update-playlist-dialog.tsx:225` |
| Save (comment dialog)     | `Save`                                                            | —        | `update-comment-dialog.tsx:71`   |
| Save (tags dialog)        | `Save changes`                                                    | —        | `add-tags.tsx:171`               |
| Save (profile form)       | `Save changes`                                                    | —        | `update-profile-form.tsx:95`     |
| Save (getting started)    | `Save your profile`                                               | —        | `getting-started.tsx:140`        |
| Save (deck settings)      | `Update your daily goal` / `Update your goal` / `Save preference` | —        | `$lang.deck-settings.tsx`        |

**Inconsistencies:**

- `Edit` icon vs `Pencil` icon (same concept, two icons — though they look identical in lucide)
- "Save" vs "Save changes" vs "Save your profile" vs "Save preference" vs "Update your daily goal"
- Submit labels vary widely: "Submit", "Save", "Save changes", "Update your daily goal"

**Recommended standard:**

| Action        | Trigger icon | Submit (short) | Submit (descriptive) |
| ------------- | ------------ | -------------- | -------------------- |
| Edit content  | `Pencil`     | `Save`         | `Save changes`       |
| Edit settings | `Settings`   | `Save`         | `Update settings`    |
| Profile edits | `Pencil`     | `Save`         | `Save profile`       |

Use `Save` as the universal short submit label. Use `Pencil` consistently (not `Edit`).

---

### E. Delete / Destructive Actions

| Context                       | Current Label    | Icon             | File:Line                                |
| ----------------------------- | ---------------- | ---------------- | ---------------------------------------- |
| Delete request trigger        | _(icon only)_    | `Trash2`         | `delete-request-dialog.tsx:54`           |
| Delete playlist trigger       | _(icon only)_    | `Trash2`         | `delete-playlist-dialog.tsx:54`          |
| Delete comment trigger        | _(icon only)_    | `Trash2`         | `delete-comment-dialog.tsx:46`           |
| Delete confirm button         | `Delete`         | —                | all delete dialogs                       |
| Remove phrase (playlist new)  | _(icon only)_    | `Trash`          | `$lang.playlists.new.tsx:317`            |
| Remove phrase (bulk-add)      | _(icon only)_    | `Trash2`         | `$lang.bulk-add.tsx:433`                 |
| Remove phrase (manage dialog) | _(icon only)_    | `Trash2`         | `manage-playlist-phrases-dialog.tsx:326` |
| Archive deck                  | `Archive deck`   | `Archive`        | `archive-deck-button.tsx:83`             |
| Restore deck                  | `Restore deck`   | `ArchiveRestore` | `archive-deck-button.tsx:75`             |
| Archive translation           | _(icon only)_    | `Archive`        | `add-translations.tsx:296`               |
| Unarchive translation         | _(icon only)_    | `Undo2`          | `add-translations.tsx:296`               |
| Unfriend                      | `Unfriend`       | `UserMinus`      | `relationship-actions.tsx:32`            |
| Cancel request                | `Cancel request` | —                | `relationship-actions.tsx:68`            |

**Inconsistencies:**

- `Trash` vs `Trash2` for the same "remove item from list" action
- Dialog titles: "Delete request?" vs "Delete playlist?" vs "Delete comment?" (consistent actually, good)

**Recommended standard:**

- Use `Trash2` consistently (it's the more common one already)
- `Archive`/`ArchiveRestore` and `Undo2` are fine for soft-delete/restore patterns

---

### F. Auth Actions

| Context                   | Current Label    | Icon       | File:Line                                              |
| ------------------------- | ---------------- | ---------- | ------------------------------------------------------ |
| Login form submit         | `Log in`         | —          | `login.tsx:118`                                        |
| Login nav link name       | `Log in`         | `LogIn`    | `links.ts:139`                                         |
| Login nav link title      | `Sign In`        | `LogIn`    | `links.ts:140`                                         |
| Login CTA (signup page)   | `Log in`         | —          | `signup.tsx:184`                                       |
| Login CTA (require-auth)  | `Log in`         | —          | `require-auth.tsx:133`                                 |
| Login CTA (homepage)      | `Sign In`        | `LogIn`    | `hero-section.tsx:129`                                 |
| Login CTA (footer)        | `Login`          | `LogIn`    | `footer-nav.tsx:98`                                    |
| Signup form submit        | `Sign Up`        | —          | `signup.tsx:181`                                       |
| Signup nav link name      | `Sign up`        | `UserPlus` | `links.ts:178`                                         |
| Signup nav link title     | `Get Started`    | `UserPlus` | `links.ts:179`                                         |
| Signup CTA (login page)   | `Create account` | —          | `login.tsx:128`                                        |
| Signup CTA (require-auth) | `Create account` | —          | `require-auth.tsx:141`                                 |
| Signup CTA (homepage)     | `Start Learning` | `UserPlus` | `hero-section.tsx:118`                                 |
| Signup CTA (footer)       | `Sign Up Free`   | `UserPlus` | `footer-nav.tsx:88`                                    |
| Signup CTA (browse)       | _(varies)_       | —          | `browse.index.tsx`                                     |
| Logout                    | `Sign out`       | `LogOut`   | `nav-user.tsx:137`                                     |
| Password submit           | `Submit`         | —          | `forgot-password.tsx:92`, `password-reset-form.tsx:79` |
| Email change submit       | `Submit`         | —          | `change-email.tsx:97`                                  |

**Inconsistencies:**

- "Log in" vs "Sign In" vs "Login" (three different casings/phrasings for the same action)
- "Sign Up" vs "Sign up" vs "Create account" vs "Start Learning" vs "Get Started" vs "Sign Up Free"
- "Sign out" for logout (only one variant, good)
- Generic "Submit" used for password reset and email change

**Recommended standard:**

| Action             | Primary label                                                   | CTA variant                       | Icon       |
| ------------------ | --------------------------------------------------------------- | --------------------------------- | ---------- |
| Log in             | `Log in`                                                        | `Log in`                          | `LogIn`    |
| Sign up            | `Sign up`                                                       | `Create account` or `Get started` | `UserPlus` |
| Sign out           | `Sign out`                                                      | —                                 | `LogOut`   |
| Form submit (auth) | `Submit` → change to specific: `Reset password`, `Update email` | —                                 | —          |

Pick one between "Log in" and "Sign in" and use it everywhere. "Log in" is currently more prevalent.

---

### G. Review / Study Actions

| Context                     | Current Label                           | Icon           | File:Line                                |
| --------------------------- | --------------------------------------- | -------------- | ---------------------------------------- |
| Start review (deck card)    | _(icon only)_                           | `Rocket`       | `deck-card.tsx:49`                       |
| Start review (review index) | `Start Today's Review`                  | `Rocket`       | `$lang.review.index.tsx:420`             |
| Start review (new cards)    | `Start Review`                          | —              | `new-cards-preview.tsx:134`              |
| Continue review             | `Continue Review`                       | —              | `continue-review.tsx:70`                 |
| Review remaining            | `Review Skipped cards ({n})`            | —              | `when-review-complete-screen.tsx:57`     |
| Review again                | `Review cards ({n})`                    | —              | `when-review-complete-screen.tsx:86`     |
| Recommendations             | `Recommendations ({n})`                 | `Sparkles`     | `$lang.review.index.tsx:403`             |
| Skip step                   | `Skip step 2` / `Skip step 3`           | —              | `when-review-complete-screen.tsx:66,116` |
| Skip for today              | `Skip for today`                        | `ChevronRight` | `$lang.review.go.tsx:147`                |
| Nav link                    | `Review` / `Daily Review`               | `Rocket`       | `links.ts:226`                           |
| Stats link                  | `Review my {lang} flashcards`           | `Rocket`       | `$lang.stats.tsx:156`                    |
| Active review callout       | `{n} cards left` / `Finish your review` | `Rocket`       | `active-review-callout.tsx`              |

**Mostly consistent.** The `Rocket` icon is well-established for review. Minor notes:

- "Start Review" vs "Start Today's Review" — context makes both fine
- Review grading buttons (`Again`, `Hard`, `Good`, `Easy`) are well-done SRS standard

---

### H. Upvote Actions

| Context         | Current Label | Icon       | aria-label                    |
| --------------- | ------------- | ---------- | ----------------------------- |
| Upvote request  | _(icon only)_ | `ThumbsUp` | uses `title` not `aria-label` |
| Upvote playlist | _(icon only)_ | `ThumbsUp` | `aria-label`                  |
| Upvote comment  | _(icon only)_ | `ThumbsUp` | uses `title` not `aria-label` |

**Inconsistency:** Request and comment upvotes use `title=` while playlist uses `aria-label=`. Should standardize on `aria-label` for all.

---

### I. Comment Actions

| Context              | Current Label  | Icon             | File:Line                      |
| -------------------- | -------------- | ---------------- | ------------------------------ |
| Add comment trigger  | _(icon only)_  | `MessagesSquare` | `request-buttons-row.tsx:35`   |
| Add reply trigger    | _(icon only)_  | `MessagesSquare` | `comment-with-replies.tsx:137` |
| Submit (new comment) | `Post Comment` | —                | `add-comment-dialog.tsx:297`   |
| Submit (reply)       | `Post Reply`   | —                | `add-comment-dialog.tsx:297`   |
| Update comment       | `Save`         | —                | `update-comment-dialog.tsx:71` |
| Delete comment       | `Delete`       | —                | `delete-comment-dialog.tsx:64` |

**Consistent!** "Post Comment" / "Post Reply" distinction is clear.

---

### J. Feed / Browse Actions

| Context                    | Current Label               | Icon        | File:Line                             |
| -------------------------- | --------------------------- | ----------- | ------------------------------------- |
| Feed nav                   | `Feed` / `{Lang} Feed`      | `Logs`      | `links.ts:243,249`                    |
| Browse nav                 | `Browse` / `Browse Library` | `Compass`   | `links.ts:99,100`                     |
| Load more (feed)           | `Load More`                 | —           | `$lang.feed.tsx` (3 places)           |
| Clear filters              | `Clear feed filters`        | —           | `$lang.feed.tsx` (3 places)           |
| Back to feed (review done) | `Back to Feed`              | `Newspaper` | `when-review-complete-screen.tsx:161` |
| Browse feed (deck card)    | `Browse Feed`               | `Logs`      | `deck-card.tsx:80`                    |
| Browse feed (stats)        | `Browse the {lang} feed`    | `Logs`      | `$lang.stats.tsx:149`                 |
| Home nav (root)            | `Home`                      | `Newspaper` | `links.ts:41`                         |

**Inconsistency:**

- Feed uses `Logs` icon in nav and deck card, but `Newspaper` in "Back to Feed" and root home. The `Newspaper` icon is used for `/` (homepage/root) while `Logs` is used for the lang-specific feed. The "Back to Feed" button should probably use `Logs` since it goes to the language feed, not the homepage.

---

## Part 3: Icon Consistency Issues

| Issue                | Current                                                                      | Recommendation                                                                   |
| -------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Feed icon            | `Logs` (nav, deck card) vs `Newspaper` (review complete "Back to Feed")      | Use `Logs` for all feed references                                               |
| Delete/remove icon   | `Trash` (playlists.new) vs `Trash2` (everywhere else)                        | Standardize on `Trash2`                                                          |
| Edit trigger icon    | `Edit` (request, playlist, comment updates) vs `Pencil` (tags, translations) | Both render identically in lucide-react, but standardize import name to `Pencil` |
| Playlists icon       | `Logs` (same as Feed)                                                        | Consider `ListMusic` (already used in plus-menu and playlist previews)           |
| Context menu trigger | `MoreVertical` / `EllipsisVertical` (same visual)                            | Standardize import to one name                                                   |
| "Invite" nav link    | `Share` icon                                                                 | Consider `UserPlus` or `Mail` to differentiate from content sharing              |

---

## Part 4: Accessibility Inconsistencies

| Issue                                                         | Files                                                                                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Upvote: `title=` vs `aria-label=`                             | `upvote-request-button.tsx`, `upvote-comment-button.tsx` use `title`; `upvote-playlist-button.tsx` uses `aria-label` |
| Plus menu trigger has no `aria-label`                         | `plus-menu.tsx:20`                                                                                                   |
| Decline friend request `X` button has no `aria-label`         | `relationship-actions.tsx:50`                                                                                        |
| Some aria-labels are lowercase                                | `review.go.tsx:150` "skip for today", `:163` "back one card"                                                         |
| Some icon buttons use `sr-only` span, others use `aria-label` | Mixed across navbar, app-nav vs other components                                                                     |

**Recommendation:** Standardize on `aria-label` for all icon-only interactive elements. Use sentence case consistently.

---

## Part 5: Toast Message Patterns

### Success toast patterns (inconsistencies):

| Pattern                    | Examples                                                         | Recommendation                     |
| -------------------------- | ---------------------------------------------------------------- | ---------------------------------- |
| Past tense                 | "Request deleted", "Playlist deleted", "Comment deleted"         | Good, keep                         |
| Past tense with details    | "Translation added for {text}"                                   | Good                               |
| Present tense              | "Image uploaded", "Tags added!"                                  | Drop the `!` for consistency       |
| Sentence                   | "Your request has been created!"                                 | Simplify to "Request created"      |
| Sentence with instructions | "Request submitted. Please find the confirmation in your email." | Fine for email-related             |
| Quoted status              | `Updated card status to "${status}"`                             | Rephrase: "Card status: {status}"  |
| Inconsistent exclamation   | Some use `!`, some don't                                         | Pick one style (recommend: no `!`) |

### Error toast patterns (inconsistencies):

| Pattern             | Examples                                                | Recommendation                      |
| ------------------- | ------------------------------------------------------- | ----------------------------------- |
| Generic             | "Something went wrong"                                  | Fine as fallback                    |
| With error message  | `"Failed to delete request: ${error.message}"`          | Good pattern                        |
| Vague               | "An error has occurred"                                 | Add specifics                       |
| Instruction-laden   | "There was some error; please refresh the page..."      | Simplify                            |
| Inconsistent prefix | "Failed to..." vs "There was an error..." vs "Error..." | Standardize on "Failed to {action}" |

---

## Part 6: Summary of Recommended Changes

### High Priority (same action, different labels)

1. **"Log in" vs "Sign In" vs "Login"** — pick `Log in` everywhere
2. **"Ignore card" vs "Skip this card" vs "Skipped"** — use `Skip` / `Skip this phrase`
3. **"Activate card" vs "Learn this phrase"** — use `Active` / `Add to deck`
4. **Feed icon: `Newspaper` vs `Logs`** — use `Logs` for feed, `Newspaper` only for root home
5. **Playlists nav uses `Logs` (same as Feed)** — switch to `ListMusic`
6. **`Trash` vs `Trash2`** — standardize on `Trash2`

### Medium Priority (inconsistent patterns)

7. **Save button text** — standardize: `Save` (short), `Save changes` (edit forms), specific verb for settings
8. **Create content verbs** — `Add` for phrases, `Post` for requests, `Create` for playlists
9. **Signup CTAs** — pick 2: "Sign up" (default) and "Get started" (marketing)
10. **Toast exclamation marks** — remove `!` from all success toasts for consistency
11. **Error toast prefix** — standardize on `"Failed to {action}"` pattern

### Low Priority (cleanup)

12. **Accessibility: `title` vs `aria-label`** — use `aria-label` everywhere
13. **Missing aria-labels** — add to plus-menu trigger, decline friend button
14. **aria-label casing** — use sentence case consistently
15. **Edit/Pencil import name** — standardize on `Pencil`
16. **Generic "Submit" buttons** — replace with specific verbs ("Reset password", "Update email")
