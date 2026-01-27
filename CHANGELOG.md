# Change Log

## v0.13 - Tiny deploy

_28th Jan, 2026_

- Make the scenetest specs work

## v0.12 - Show intro notices, add scenetest-js, peruse new cards, highlight ongoing review

_26th Jan, 2026_

- Add intro/onboarding system with useIntro hook, fix tests (bfbbf83d)
- Highlight active/ongoing review in sidebar and nav (fb4d8675)
- Add "peruse new cards" interface before review (0841b035)
- Remove yellow/gold (sand) theme from rotation (888ee649)
- Fix layout and display issues: 404 page, card count, button breakpoints (84226546)
- Fix select dropdown not scrolling when content overflows viewport (f3438ab8)
- Improve accessibility: aria-labels, role=link, keyboard support (a410afe0)
- Show unread message in chat preview instead of most recent (46188118)
- DX: Add scenetest-js, actors, scenes, lots of test labels (700d2c32)

## v0.11

_21st Jan, 2026_

- Feature: Social media previews (using edge middleware)
- Feature: Chat messages have read/unread
- Feature: Welcome page now welcomes new users
- Fix: Second sidebar was hiding sometimes, and too complex
- Fix: The scrollable areas weren't constraining/flexing just right
- DX: Improve tests, log redirects
- Feature: Full width interfaces! Right sidebar "Quick actions"
- Polish: Group & style the Response Buttons row
- Chore: Convert all toasts to Sonner
- Feature: Copyable, persistent toasts, particularly for errors

## v0.10 - Smart Search, DM Playlists, Popularity Feed

_18th Jan, 2026_

- Smart search! using trigrams (f094673b6a8205f655630f0c7b3fb875eea140ef)
- (c2, d2) Feature: Friends feed and Popular feed polymorphic with filters
- Add "popularity" to the feed-activities view
- (c1, d1) Move add-phrases route to `learn/$lang/phrases/new`
- (c2, d2) Feature: Playlists image option
- (c1, d1) Feature: "You completed your review" nicer screen
- (c2, d2) Chore: Replace the friend request / accept / cancel logic with a before hook
- Fix: ALL remaining `tsc -b` errors
- Feat: Cover images on Playlists!
- Fix/Refactor: Review cards flow/order is fixed, more declarative, more local-first, w better completion screen
- Prevent spoofing uids by updating RLS Insert policies
- Feat: share playlists in chat
- Fix: window height in chat window

## v0.9 - Only-Reverse-Reviews, Github Actions CI

_16h Jan, 2026_

- (c2, d2) DX: GitHub actions for CI/CD
- (c2, d2) DX: Navigating-around-the-app tests
- (c2, d2) Chore: Retire PLv8, move FSRS to client
- (c1, d1) Feat: catch login on signup page and show better feedback
- (c2, d1) Feat: edit or archive translations
- (c1, d1) Fix: query collection errors on logout/login
- (c2, d2) Feat: Only-Reverse-Reviews setting for some cards
- (c2, d2) Fix: Auth state transition bugs (sign out + login race conditions)

## v0.8 - Browse Page

_15th Jan, 2026_

- (c1, d1) A. Fix: Embeds not working in production (bdd0e7e9)
- (c1, d1) AB. Fix: Poor RLS performance for chat messages (16b3f200)
- (c1, d1) B. Feature: Add Dyslexie/OpenDyslexic font support (8ca64970)
- (c1, d2) Feature L: Browse page search box, w filters (bc04dc1a)

## v0.7 - New `phrase_meta` view, More local-first-ian

_14th Jan, 2026_

- (c3, d2) Refactor: meta_phrase_info into phrase_meta, do less, more reliably
- (c1, d1) Fix: review buttons were all one colour
- (c1, d1) Fix ago() returning '1 mo ago' for null dates (e723a944)
- (c1, d1) Fix /learn/undefined should 404 (45b04d8e - prior work)
- (c1, d1) Fix DialogContent aria-labelledby/description warnings (a73a4fbf)
- (c1, d1) Make default theme 'light' (85474e8f)
- (c1, d1) Add 'add to deck' option to bulk-add (746f3073)
- (c1, d1) Add 'learned' and 'skip' options to review context menu (4da341d1)

## v0.6 - React Compiler, Bookmark Phrases

_12th Jan, 2026_

- (c1, d1) Fix: Loading spinner creating scrollbars
- (c3, d2) Add: react compiler, remove linter cruft
- (c1, d1) Chore: Remove these console logs `We expected a userId here`
- (c1, d1) Fix: convert the PlusMenu to standard shadcn menu
- (c1, d1) Design: Try font "Instrument Sans"
- (c1, d1) Design: Use Bookmark\* icons to card status
- (c1, d1) Feat: throw notFound() for /learn/{whatever}
- (c1, d1) Changing card status updates the phrase's metadata (count_learners) etc

### v0.5.2 - Hotfix: Drop conflicting RPC for adding phrases

### v0.5.1 - Hotfix: Remove Ugly Theme\*\*

## v0.5 - Public Mode

_10th Jan, 2026_

- (c3, d3) Public mode
- (c3, d3) When you try to add a phrase but you don't have a deck for that language, a checkbox gives you the option to start learning (or re-activate) that deck, or to create the new phrase without one.
- (c2, d2) Deck-configurable preferred translation lang
- (c1, d1) Fix Typescript Errors in Bulk-Add.tsx

## v0.4 - Playlists and the Polymorphic Feed

_January 2026_

This release adds an important "Playlists" feature, which allows users to add a set of cards together, and group them with a title and description, and optionally a link to an external resource like a podcast or a video or a song. So users can create things like:

- A set of phrases that are words to an iconic song
- A set of phrases that have been taught in this episode of a lesson or podcast
- A set of lines from a movie compilation

The first user will make and publish the playlist, and then other users can choose to watch or listen to the media and then add the set of phrases to their deck, and they won't appear at random any more because they will have been introduced in some way, giving the users choice and aligned expectations for what they experience in their review sessions.

Then, the existence of the Playlists, which also need to be displayed on the feed alongside Requests, led us to the creation of a _Feed view_ which combines Requests, Playlists, and also newly created Phrases. This Feed operates differently from our local collections because it doesn't contain the library data, it just shows us an order, essentially returning a Feed Skeleton with some attached metadata for any client-side sorting that may be required. These quasi Feed Skeletons are stored simply in a react query cache.

## v0.3 - Feeds! Recent requests, upvotes, comments, recs

_December 2025_

Here we have added the bulk of the features that the architectural work of v0.2 was meant to make
possible for our small team to maintain a fully modern approach that meets very high standards for
a native-feeling mobile app, while adding on a big surface area of interactive features: a social
media style feed with comments, votes, different feeds/algos, etc.

You can [view new features and views in the screenshots posted on the PR](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683). They include:

- The language requests feed is now much more like a social media feed, with request posts, top-
  level comments, and replies.
- Comments and replies can have up to 4 card recommendations, which are treated as proposed
  "answers" to the request.
- We currently have feeds for "most recent" and "friends", and have a disabled teaser option for
  "most popular" to indicate the direction we plan to go with this in the near future.

[Style work and visual language enhancements are also shown and detailed in the PR.](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683)

## v0.2 - Social Features and New Data Management

_November 2025_

Since April we have added direct messages, realtime connections for friend requests, alert badges
to help users discover features and important interactions.

We have opened up a new feature realm with the addition of "Phrase Requests", allowing users to
describe a situation and what they want to communicate, and ask native speakers to answer with a
flash card that will prepare them for similar situations in the future. This "requests" concept
provides a cross-language meta-layer, describing what linguists call "messages" (the actual _thing_
you want to convey), which mirrors the way people actually learn languages in the real world: by
asking a friend or colleague who speaks the language already, "Hey, when I want to hail a cab, what
do I say?"

In the next phase, this "Requests" concept will become the basis for additional social features,
and will allow us to identify _across all languages_ which types of cards will be most useful for
learners of other languages, to help us make the most out of our crowd-sourcing model, so that work
put into one language can be used to ease the path for others.

To make these more interactive and more social features perform better on device, and require less
bandwidth and re-fetching from the server, this version include a major upgrade to the way
data is fetched and stored on device, using Tanstack DB's live queries for all data in the app.

- Preloads almost the entire database in route loaders (we will replace this soon with more precise
  partial loaders, added in a recent version but not needed yet).
- Local DB _Collections_ store normalised copies of data, backed by Zod schemas.
- `useSomeData` style hooks are now based on `useLiveQuery` which allows us to join and filter data,
  and, importantly, to calculate aggregate data this way so we can replace postgres-view-based
  aggregation and have our aggregates automatically respond to any inserts into the local database.
- Collections are initialised, populated, and invalidated/cleared differently to how the query
  cache worked, so we have to be more careful about race conditions on loading and logout.

To help us manage this new complexity, we have added Playwright for end-to-end testing, which pairs
well with the Schema-backed runtime validation of our Collections to test all interactions between
client and server.

- Use Playwright specs to orcestrate browser navigation through all main features of the app,
  particularly mutations.
- Use `both-helpers.ts` to query the DB as service role and evaluate the local collection and
  return both, then compare them in the spec.

## v0.1 - The MEP

_April 2025_

This release contains the minimum feature set for an enjoyable flash card-learning experience.

Users can create cards, add translations, and perform reviews with the Spaced Repetition system,
FSRS v5.0. Read more:

- [Wikipedia: Spaced Repetition](https://en.wikipedia.org/wiki/Spaced_repetition)
- [The FSRS Algorithm, Explain](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) (with more links!)
