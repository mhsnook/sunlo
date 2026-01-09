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

## ANALYSIS

### Current Implementation

- The `add_phrase_translation_card` RPC function (base.sql:100) creates phrase + translation + card in one atomic operation
- The function does NOT check if a deck exists before creating the card
- user_card table has a `lang` field but no foreign key constraint to user_deck
- Cards can technically exist without a deck, but this may cause issues elsewhere in the app

### Files Impacted

1. **Backend (SQL/RPC)**:
   - `/supabase/schemas/base.sql` - Modify `add_phrase_translation_card` function
   - New migration file needed to update the RPC function
2. **Frontend (React/TypeScript)**:
   - `/src/routes/_user/learn/$lang.add-phrase.tsx` - Add checkbox UI for "Start learning X"
   - Possibly `/src/lib/mutate-deck.ts` - Reuse deck creation logic
   - May need to handle archived deck reactivation

### Implementation Options

**Option A: Split Operations (Recommended)**

- Create two separate operations: "Add phrase" and "Add to deck"
- Add checkbox UI: "Start learning [language]" (visible only when no active deck exists)
- Show different text for archived decks: "Re-activate [language] deck"
- On submit:
  1. Always create phrase + translation
  2. If checkbox checked: create/reactivate deck, then create card
  3. If checkbox unchecked: skip card creation

**Option B: Always Create Deck**

- Automatically create deck when adding phrase for new language
- Simpler UX but less control for users who just want to contribute phrases
- Could annoy users who want to add phrases for languages they're not learning

**Option C: Post-Failure Recovery**

- Keep current behavior but catch the error
- Show dialog: "Would you like to start learning [language]?"
- If yes, create deck and retry
- More complex error handling, worse UX

### Recommended Approach: Option A

#### Implementation Steps:

1. **Modify RPC function** to accept optional `create_card` boolean parameter:
   ```sql
   create or replace function add_phrase_translation_card (
   	phrase_text text,
   	phrase_lang text,
   	translation_text text,
   	translation_lang text,
   	phrase_text_script text default null,
   	translation_text_script text default null,
   	create_card boolean default true -- NEW
   )
   ```
2. **Add deck status detection** in add-phrase component:
   - Check if user has active deck for lang: `useDeck(lang)`
   - Check if user has archived deck: query decksCollection
3. **Update UI** to show conditional checkbox:
   ```tsx
   {
   	!hasActiveDeck && (
   		<Checkbox
   			label={
   				hasArchivedDeck ? 'Re-activate Tamil deck' : 'Start learning Tamil'
   			}
   			checked={shouldCreateDeck}
   			onChange={setShouldCreateDeck}
   		/>
   	)
   }
   ```
4. **Handle deck creation** in mutation:
   - If checkbox checked && no active deck: call `useNewDeckMutation`
   - Wait for deck creation before calling RPC
   - Or: create new RPC that handles both operations atomically

### Questions for Human Manager:

1.<ANSWER>YES</Answer> Should we allow users to add phrases for languages they're not learning? (affects whether checkbox is optional or required) 2. <ANSWER>CHECKBOX-DRIVEN</ANSWER> For archived decks, should "re-activate" happen automatically or require confirmation? 3. <ANSWER>YES</ANSWER> Should this behavior apply to bulk-add as well, or just single phrase add? 4. <ANSWER>YES</ANSWER> Should we show a toast/success message that mentions both phrase creation AND deck creation?

### Estimated Difficulty: 3

- Requires both SQL and UI changes
- Need to handle multiple conditional states (no deck, archived deck, active deck)
- Must ensure atomicity/transaction safety
- May affect other parts of the app that assume cards always exist

LESSONS LEARNED:

### Feature: "Public" mode so you can browse feeds / playlists / requests / phrases without a login

STATUS: PENDING
COMPLEXITY: 3
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
This is a self-explanatory feature but implementation may be complex. A bunch of components may need to be hidden when the user is not logged in, or they may need to trigger a dialog "go sign up/log in" when you try to take an action, etc. It's fine to keep the functionality really minimal (nice ever) in "public mode", so hide as often as you want. Some menus will still be wanted, like the native share button, copy link, and all navigations.

NOTE FROM CODING AGENT:

## ANALYSIS

### Current Implementation

- All content routes are under `/_user` which requires authentication (src/routes/\_user.tsx:28-43)
- `beforeLoad` checks `context.auth.isAuth` and redirects to `/login` if false
- No public browsing routes exist for feeds, playlists, requests, or phrases
- Public collections (phrases, playlists, requests) already sync for all users

### Files Impacted

**Major Changes:**

1. **Route Structure**:

   - Create new route layout: `/src/routes/_public.tsx` (optional auth)
   - Move or duplicate routes:
     - `/_user/learn/$lang.feed.tsx` → `/_public/browse/$lang/feed.tsx`
     - `/_user/learn/$lang.playlists.tsx` → `/_public/browse/$lang/playlists.tsx`
     - `/_user/learn/$lang.requests.tsx` → `/_public/browse/$lang/requests.tsx`
     - `/_user/learn/$lang.phrases.$id.tsx` → `/_public/browse/$lang/phrases/$id.tsx`
   - OR: Modify existing routes to work with optional auth

2. **Components Needing Conditional Rendering**:

   - Navigation (show "Login/Signup" instead of user menu when not authenticated)
   - Action buttons (Add to deck, Create playlist, etc.) - show "Login to..." dialog
   - Comments section - allow viewing but not posting when not authenticated
   - Upvote buttons - redirect to login when clicked
   - User profiles - show limited info when not authenticated

3. **Auth Context**:
   - Update `MyRouterContext` to handle `isAuth: false` gracefully
   - Update `titleBar`, `appnav`, `contextMenu` to work without auth

### Implementation Options

**Option A: Duplicate Routes (Safer)**

- Create separate `/_public` layout with duplicated route files
- Keep `/_user` routes unchanged for authenticated users
- Easier to maintain different experiences
- More code duplication

**Option B: Shared Routes with Conditional Auth (Recommended)**

- Create `/_optional_auth.tsx` layout that doesn't redirect
- Move shared routes (feed, playlists, requests, phrases) here
- Use conditional rendering: `{auth.isAuth && <ActionButton />}`
- Less duplication, single source of truth
- Requires careful conditional logic throughout

**Option C: Keep Existing Routes, Remove Auth Check**

- Remove redirect from `/_user` beforeLoad
- Add conditional checks throughout all components
- Riskiest - easy to miss auth checks
- Could expose private data if not careful

### Recommended Approach: Option B

#### Implementation Steps:

1. **Create Optional Auth Layout** (`/src/routes/_optional_auth.tsx`):

   ```typescript
   export const Route = createFileRoute('/_optional_auth')({
   	beforeLoad: ({ context }) => ({
   		// No auth check, but pass auth state through
   		auth: context.auth,
   		titleBar: { title: 'Browse' },
   	}),
   	loader: async () => {
   		// Preload public collections only
   		await Promise.all([
   			languagesCollection.preload(),
   			phrasesCollection.preload(),
   			phrasePlaylistsCollection.preload(),
   			requestsCollection.preload(),
   		])
   	},
   	component: PublicLayout,
   })
   ```

2. **Create Public Browse Routes**:

   - `/browse/$lang/feed`
   - `/browse/$lang/playlists`
   - `/browse/$lang/requests`
   - `/browse/phrases/$id`

3. **Create Reusable Hook** for auth-dependent actions:

   ```typescript
   export function useRequireAuth() {
   	const { auth } = Route.useRouteContext()
   	const navigate = useNavigate()

   	return useCallback(
   		(action: () => void) => {
   			if (!auth.isAuth) {
   				toast.error('Please login to continue')
   				navigate({ to: '/login', search: { redirectedFrom: location.href } })
   			} else {
   				action()
   			}
   		},
   		[auth.isAuth, navigate]
   	)
   }
   ```

4. **Update Components** with conditional rendering:

   ```tsx
   // In feed items, playlist items, etc.
   const requireAuth = useRequireAuth()

   {
   	auth.isAuth ?
   		<Button onClick={() => addToDeck()}>Add to Deck</Button>
   	:	<Button onClick={() => requireAuth(() => {})}>Login to Add</Button>
   }
   ```

5. **Update Navigation**:

   - Show "Browse" menu item for non-authenticated users
   - Hide user-specific items (My Decks, Profile, Friends)
   - Show "Login/Signup" button prominently

6. **Minimal Features in Public Mode**:
   - ✅ View feeds (phrases, playlists, requests)
   - ✅ View phrase details
   - ✅ Navigate between languages
   - ✅ Share buttons, copy link
   - ❌ Upvoting (show login prompt)
   - ❌ Commenting (show login prompt)
   - ❌ Creating content (show login prompt)
   - ❌ Adding to deck (show login prompt)

### Questions for Human Manager:

1. Should public users be able to view user profiles? (privacy consideration)
2. Should we show upvote counts in public mode, even if they can't upvote?
3. Do we want a "Sign up to start learning" CTA on every page, or just in navigation?
4. Should public users be able to see the full phrase translation, or just a preview?

### Estimated Difficulty: 3

- Requires significant routing changes
- Many components need conditional rendering
- Need to ensure no private data leaks
- Must test all user flows carefully
- Potential RLS policy review needed

LESSONS LEARNED:

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

## ANALYSIS

### Current Implementation

- User has global `languages_known` array in profile (ordered by proficiency)
- Translation language defaults to `profile.languages_known[0].lang` (implemented in recent task)
- No deck-specific translation preference exists
- All translation components use the global default

### Files Impacted

**Backend (SQL):**

1. `/supabase/schemas/base.sql` - Add column to user_deck table
2. New migration file - `add_preferred_translation_lang_to_deck.sql`
   ```sql
   alter table user_deck
   add column preferred_translation_lang varchar(3) default null;
   ```

**Frontend (React/TypeScript):**

1. `/src/lib/schemas.ts` - Update DeckMetaSchema to include new field
2. `/src/types/supabase.ts` - Regenerate types with `pnpm run types`
3. `/src/routes/_user/learn/$lang.deck-settings.tsx` - Add UI for setting preference
4. `/src/hooks/use-deck.ts` - Create hook to get deck's preferred translation lang
5. **Update all translation form defaults** (3 files):
   - `/src/routes/_user/learn/$lang.add-phrase.tsx`
   - `/src/components/card-pieces/add-translations.tsx`
   - `/src/components/phrases/inline-phrase-creator.tsx`

### Implementation Approach

#### Phase 1: Database & Schema (Simple)

1. Add nullable column `preferred_translation_lang` to `user_deck` table
2. Set default to NULL (will fallback to profile default)
3. Regenerate TypeScript types
4. Update Zod schema for DeckMeta

#### Phase 2: Deck Settings UI (Moderate)

1. Add to `/src/routes/_user/learn/$lang.deck-settings.tsx`:
   ```tsx
   <SelectOneLanguage
   	value={form.watch('preferred_translation_lang')}
   	setValue={(lang) => form.setValue('preferred_translation_lang', lang)}
   	label="Preferred Translation Language"
   	description="Which language would you like to see translations in for this deck?"
   />
   ```
2. Update mutation to save the new field
3. Handle NULL value (means "use profile default")

#### Phase 3: Hook for Translation Lang Preference (Simple)

Create utility hook in `/src/hooks/use-deck.ts`:

```typescript
export function usePreferredTranslationLang(lang: string): string {
	const { data: profile } = useProfile()
	const { data: deck } = useDeck(lang)

	return useMemo(() => {
		// Deck-specific override
		if (deck?.preferred_translation_lang) {
			return deck.preferred_translation_lang
		}
		// Global default from profile
		return profile?.languages_known[0]?.lang ?? 'eng'
	}, [deck, profile])
}
```

#### Phase 4: Update All Translation Forms (Simple)

Replace direct `profile?.languages_known[0]?.lang ?? 'eng'` with hook:

```typescript
// Before:
defaultValues: {
	translation_lang: profile?.languages_known[0]?.lang ?? 'eng'
}

// After:
const preferredLang = usePreferredTranslationLang(lang)
defaultValues: {
	translation_lang: preferredLang
}
```

#### Phase 5: Default for New Decks (Simple)

In `/src/lib/mutate-deck.ts`, when creating a new deck:

```typescript
.insert({
  lang,
  preferred_translation_lang: profile?.languages_known[0]?.lang ?? 'eng'
})
```

### Edge Cases to Handle

1. **NULL vs explicit value**: NULL means "use profile default", explicit value overrides
2. **Profile default changes**: If user reorders languages_known, deck preference persists
3. **Invalid language code**: Validate that preferred_translation_lang is a valid 3-letter code
4. **Deck settings form**: Show current effective value even when NULL (display profile default with note)

### Questions for Human Manager:

1. Should we allow users to set an ordered list of preferred languages per deck, or just one? <Answer>Just one</Answer>
2. If a user doesn't speak the preferred_translation_lang anymore (removes it from profile), should we auto-reset it to NULL? <Answer>No, don't update the deck's setting in any potentially unexpected way.</Answer>
3. Should this setting also affect which translation is shown first in phrase detail views? <Answer>Yes</Answer>
4. Do we want a "Reset to profile default" button in the deck settings? <Answer>Ya, maybe say "Remove first language override" or something so it's clear it's related to this thing</Answer>

### Estimated Difficulty: 2

- Straightforward database change (one column)
- Simple UI addition to existing settings page
- Need to update multiple form defaults (but pattern is consistent)
- No complex state management
- Minimal edge cases

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

### Estimated Difficulty: 2

- Data mostly exists in views/tables
- Need to create 2-3 new hooks
- UI layout is straightforward
- No complex state management
- May need to optimize queries for performance

LESSONS LEARNED:

## Completed

- [x] The big phrase card shows metadata like # of learners & provenance
- [x] Comment dialog should assume a new phrase is the only phrase
- [x] Fix Languages-Known ESLint errors
- [x] Fix Composite-Pids ESLint errors
