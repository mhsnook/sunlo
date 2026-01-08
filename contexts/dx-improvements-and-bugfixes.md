# Sprint Doc

## Instructions for the Coding Agent

1. Please start by picking one item from the list below with `STATUS: PENDING` that looks simple and does not require any explanation or interaction with other issues.
2. Attempt to resolve the issue or complete the feature, writing tests and using the formatter and linter to validate your work.
3. Try the item up to 3x before giving up.
4. Each item lists a "COMPLEXITY" score from 1 to 4. This should tell you how much effort we think you should be putting in to each try.
5. If you need to ask questions to the human engineering manager, simply add them to the document along with the item below, and skip the item.
6. When you have finished an item, or reached the retry limit, or determined that you require more clarification from the human manager, write a note in the document along with the item below, so that you can forget our discussions later but retain this log. Update the DIFFICULTY score from 1 to 4 based on your experience so far working on the item.
7. If you have completed the task, perform a git commit with a concise summary of the work.
8. Go back to step 1 as long as there are more PENDING items.

## Items to Work On

### Feature: When you try to add a phrase to a language you don't have a deck for, it fails, but it should either add the phrase without adding the deck, or prompt you to add a deck, or both

STATUS: PENDING
COMPLEXITY: 3
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
When you try to add a phrase for a language you don't have a deck for, it fails, but it should either be able to add the phrase without adding the deck, or prompt you to add a deck, or both. Possible we could accomplish this with a flag "also add this to deck" which would be a checkbox in the UI, and if the user doesn't have that deck then the checkbox just isn't there. Instead perhaps is a checkbox "start learning <language>" which would, if checked, also create the new deck. Or if the deck is present but archived it could say "re-activate <language> deck"

NOTE FROM CODING AGENT:

LESSONS LEARNED:

### Feature: "Public" mode so you can browse feeds / playlists / requests / phrases without a login

STATUS: PENDING
COMPLEXITY: 3
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
This is a self-explanatory feature but implementation may be complex. A bunch of components may need to be hidden when the user is not logged in, or they may need to trigger a dialog "go sign up/log in" when you try to take an action, etc. It's fine to keep the functionality really minimal (nice ever) in "public mode", so hide as often as you want. Some menus will still be wanted, like the native share button, copy link, and all navigations.

NOTE FROM CODING AGENT:

LESSONS LEARNED:

### UX: Comment dialog should assume a new phrase is the only phrase

STATUS: COMPLETE
COMPLEXITY: 1
DIFFICULTY: 1

DESCRIPTION FROM HUMAN MANAGER:
When adding a new phrase in the "select a phrase for the comment" dialog, close the select dialog right away, assuming that it's the only phrase the user will be adding to this comment.

NOTE FROM CODING AGENT:
✅ COMPLETED - Updated the `handlePhraseCreated` callback in `/components/comments/select-phrases-for-comment.tsx` to close the phrase selection dialog immediately after creating a new phrase.

The fix was a simple one-line addition: `setPhraseDialogOpen(false)` to the `handlePhraseCreated` callback, which now:

1. Adds the newly created phrase to the selection
2. Closes the inline create form
3. Closes the entire phrase selection dialog (NEW)

This provides a smoother UX by assuming the newly created phrase is the only one the user wants to add, avoiding an extra click to close the dialog.

Code formatted and ready to commit.

LESSONS LEARNED:

- The InlinePhraseCreator component is used within the SelectPhrasesForComment dialog
- The handlePhraseCreated callback already existed and handled adding the phrase to selection
- Only needed to add the dialog close call to complete the UX improvement
- Test failures were unrelated (login timeout issues affecting all tests)

### Fix Embed Bug

STATUS: COMPLETE
COMPLEXITY: 1
DIFFICULTY: 1

DESCRIPTION FROM HUMAN MANAGER:
I'm getting this error when I try to load a playlist with a youtube embed.

```
www-embed-player.js:2362 Uncaught SecurityError: Failed to read the 'caches' property from 'Window': Cache storage is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag.
(anonymous) @ www-embed-player.js:2362Understand this error
2lk97RmZNf8:10 Uncaught ReferenceError: writeEmbed is not defined
    at 2lk97RmZNf8:10:1479
```

NOTE FROM CODING AGENT:
✅ COMPLETED - Fixed YouTube embed SecurityError by updating iframe sandbox attributes in `/src/components/playlists/playlist-embed.tsx`.

The error was caused by restrictive iframe sandbox settings. The `sandbox="allow-scripts"` attribute was blocking YouTube's cache storage access. Added `allow-same-origin` flag to resolve this.

Changes made:

- Updated YouTube iframe: `sandbox="allow-scripts allow-same-origin"`
- Updated Spotify iframe: `sandbox="allow-scripts allow-same-origin"`
- Updated SoundCloud iframe: `sandbox="allow-scripts allow-same-origin"`

This is a standard web security pattern for embedded content that needs proper functionality while maintaining reasonable security boundaries.

Code formatted and ready to commit.

LESSONS LEARNED:

- iframe sandbox attributes need both `allow-scripts` and `allow-same-origin` for embedded players to access browser APIs like cache storage
- The error specifically mentioned "lacks the 'allow-same-origin' flag" which made diagnosis straightforward
- Applied the fix consistently across all three embed types (YouTube, Spotify, SoundCloud)

### Feature: The translation language select box should default to your first language

STATUS: COMPLETE
COMPLEXITY: 1
DIFFICULTY: 1

DESCRIPTION FROM HUMAN MANAGER:
The translation language select box should default to your first language.

NOTE FROM CODING AGENT:
✅ COMPLETED - Updated all forms using `TranslationLanguageField` to default to the user's first language from their profile.

Changes made:

1. Updated `/routes/_user/learn/$lang.add-phrase.tsx`:
   - Added `useProfile()` hook
   - Set default value: `translation_lang: profile?.languages_known[0]?.lang ?? 'eng'`
   - Also updated the reset() call to preserve this default after successful submission
2. Updated `/components/card-pieces/add-translations.tsx`:
   - Added `useProfile()` hook
   - Set same default value for translation_lang
3. Updated `/components/phrases/inline-phrase-creator.tsx`:
   - Added `useProfile()` hook
   - Set same default value for translation_lang

The pattern follows what's already used in `$lang.bulk-add.tsx`. The first language in `profile.languages_known` array is considered the user's primary language, with a fallback to 'eng' if not available.

Code formatted and ready.

LESSONS LEARNED:

- The user's profile has `languages_known` array where the first element is their primary language
- This pattern (`profile?.languages_known[0]?.lang ?? 'eng'`) is already used elsewhere in the codebase for consistency
- All three components that use TranslationLanguageField needed to be updated for a complete fix

### Deck-Specific Setting for "First Language"

STATUS: PENDING
COMPLEXITY: 2
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
Each Deck should have a configuration for the best translation lang for the user, and we should use that as the default translation language to display in one-translation components, the first one to show in all-translation views, and the default language to enter translations for any new card. me (an ordered one even). when in doubt, give me tamil translations for kannada. when in doubt, give me english translations for german. This would go in the deck settings page and when you create a new language it would default to your first language from your profile, but it would allow the user to, e.g. set English as their main language but then when learning Kannada have the first language be Tamil because they speak Tamil well too and the languages are more similar.

NOTE FROM CODING AGENT:

LESSONS LEARNED:

### DX: NPM Script to run tests, accept args for which project and which test

STATUS: COMPLETE
COMPLEXITY: 1
DIFFICULTY: 1

DESCRIPTION FROM HUMAN MANAGER:
The NPM Scripts to run playwright tests should accept args for which project and which test to run, to make it easier to do development even if you only have access to the scripts in packages.json.

NOTE FROM CODING AGENT:
✅ COMPLETED - Added convenience scripts for each browser project (chromium, firefox, webkit) to package.json. The scripts now support:

- `pnpm test` - runs all tests (can add args: `pnpm test <file>` or `pnpm test --project=chromium <file>`)
- `pnpm test:chromium <file>` - runs specific file in chromium only
- `pnpm test:firefox <file>` - runs specific file in firefox only
- `pnpm test:webkit <file>` - runs specific file in webkit only
- `pnpm test:ui` - opens Playwright UI mode

Examples:

- Run specific file: `pnpm test e2e/mutations/cards.spec.ts`
- Run specific file in chromium: `pnpm test:chromium e2e/mutations/cards.spec.ts`
- Run with any playwright args: `pnpm test --headed e2e/login-flow.spec.ts`

Tested and verified working.

LESSONS LEARNED:

- PNPM naturally passes arguments through to scripts, so `pnpm test <args>` just works
- Adding browser-specific convenience scripts makes it more discoverable
- Both `pnpm script args` and `pnpm script -- args` work (the `--` separator is optional with pnpm)

### Feature: The big phrase card should show metadata like # of learners & provenance

STATUS: PENDING
COMPLEXITY: 2
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
The big phrase card should show metadata like # of learners & provenance of the card, use it as social proofing "lots of people learning, avg difficulty X, your last review date" and then also show provenance like a list of playlists and/or comment threads it's been linked in so users can click and see context, and especially if there is an href in one of these links this will likely take the user to an audio clip where they can hear the pronounciation.

NOTE FROM CODING AGENT:

LESSONS LEARNED:

### Feature: Back-office dashboard to show usage, recent signups, recent deck creation, review sessions

STATUS: PENDING
COMPLEXITY: 2
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
This is complexity 2 because we are just looking for a basic proof of concept (not a lot of features), but it also matters to get security things handled nicely. We may need to use some kind of "administrator" or "dashboard_user" role that we apply to certain accounts in the system, and have new RLS policies that allow that role to access the dashboard.

We should be able to see:

- Daily active users, weekly/monthly active users
- New users this week / dropoff (former active)
- Recent signups / deck creation
- Recent review sessions / users active on social vs. reviews

NOTE FROM CODING AGENT:

LESSONS LEARNED:

### DX: Fix Composite-Pids ESLint errors

STATUS: COMPLETE
COMPLEXITY: 2
DIFFICULTY: 2

DESCRIPTION FROM HUMAN MANAGER:
Please run `pnpm lint` and see all the errors in the `@src/hooks/composite-pids.ts`. There's a lot! Is it easy to fix? Should we rewrite this hook? Is there a small surgical fix? Please try to fix but feel free to also just propose a couple options and move on.

NOTE FROM CODING AGENT:
✅ COMPLETED - Fixed all 18 ESLint errors in `/src/hooks/composite-pids.ts` using a surgical fix.

The problem: The code was trying to destructure a non-existent `state` property from `useLiveQuery`, and TypeScript couldn't infer proper types for `phrasesMap.get()` operations.

The fix:

1. Removed the invalid `state: phrasesMap` destructuring from `useLanguagePhrases(lang)`
2. Created a properly-typed Map manually using `useMemo`:
   ```typescript
   const phrasesMap = useMemo(
   	() =>
   		phrases ?
   			new Map<uuid, PhraseFullType>(phrases.map((p) => [p.id, p]))
   		:	new Map<uuid, PhraseFullType>(),
   	[phrases]
   )
   ```
3. Added proper type imports (`uuid`, `PhraseFullType`)

Result: Reduced from 18 errors to 0 errors in this file. The fix maintains the same performance characteristics (fast O(1) lookups) while properly typing the Map.

Code formatted and ready to commit.

LESSONS LEARNED:

- TanStack DB's `useLiveQuery` returns `{ data, isReady, isLoading }` but NOT a `state` property
- The custom `UseLiveQueryResult` type was correctly typed, but the code was expecting something that doesn't exist
- When creating Maps from arrays, explicit typing prevents TypeScript from inferring `any`
- The pattern `new Map<K, V>(array.map(item => [key, value]))` is the standard approach
- This was a surgical fix - no rewrite needed, just proper type annotations

### DX: Fix Languages-Known ESLint errors

STATUS: COMPLETE
COMPLEXITY: 2
DIFFICULTY: 1

DESCRIPTION FROM HUMAN MANAGER:
Please run `pnpm lint` and see all the errors in the `@src/components/fields/languages-known-field.tsx`. There's a lot! Is it easy to fix? Should we rewrite this component altogether? Is there a small surgical fix? Please try to fix but feel free to also just propose a couple options and move on.

NOTE FROM CODING AGENT:
✅ COMPLETED - Fixed all 12 ESLint errors (10 in languages-known-field.tsx, 2 in types.d.ts) using a surgical type fix.

The problem: The `AnyArrayFieldType` type had an overly permissive index signature that allowed either `FieldError` directly OR a `Record<string, FieldError>`, causing TypeScript to infer `error` type instead of the proper structure.

The fix (in `/src/components/fields/types.d.ts`):

1. Made `AnyArrayFieldType` generic over `T extends FieldValues`
2. Changed the index signature from:
   ```typescript
   [x: number]: FieldError | Record<string, FieldError> | undefined
   ```
   to:
   ```typescript
   [x: number]: Record<string, FieldError | undefined> | undefined
   ```
3. Updated `ArrayFieldProps` and `ControlledArrayFieldProps` to pass the generic parameter
4. Removed unused `ArrayFieldValues` import

Result: Reduced from 12 errors to 0 errors. The type now accurately reflects that array field errors are objects with nested field errors (like `{ lang?: FieldError, level?: FieldError }`), not flat FieldError values.

Code formatted and ready to commit.

LESSONS LEARNED:

- Index signatures can conflict with specific properties if types aren't carefully designed
- The original type allowed `FieldError | Record<string, FieldError>` which created ambiguity
- The actual usage pattern shows errors are always records/objects, never flat FieldError values
- Making helper types generic allows for better type safety and inference
- This was easier than expected - just needed to refine the type definition, no component rewrite needed
