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

1. Should we allow users to add phrases for languages they're not learning? (affects whether checkbox is optional or required)
2. For archived decks, should "re-activate" happen automatically or require confirmation?
3. Should this behavior apply to bulk-add as well, or just single phrase add?
4. Should we show a toast/success message that mentions both phrase creation AND deck creation?

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

1. Should we allow users to set an ordered list of preferred languages per deck, or just one?
2. If a user doesn't speak the preferred_translation_lang anymore (removes it from profile), should we auto-reset it to NULL?
3. Should this setting also affect which translation is shown first in phrase detail views?
4. Do we want a "Reset to profile default" button in the deck settings?

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

### Feature: The big phrase card should show metadata like # of learners & provenance

STATUS: PENDING
COMPLEXITY: 2
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
The big phrase card should show metadata like # of learners & provenance of the card, use it as social proofing "lots of people learning, avg difficulty X, your last review date" and then also show provenance like a list of playlists and/or comment threads it's been linked in so users can click and see context, and especially if there is an href in one of these links this will likely take the user to an audio clip where they can hear the pronounciation.

NOTE FROM CODING AGENT:

## ANALYSIS

### Current Implementation

- Big phrase card component: `/src/components/cards/big-phrase-card.tsx`
- `meta_phrase_info` view already includes: `avg_difficulty`, `count_cards`, `count_active`, `count_learned`
- No provenance data currently shown (playlists, comment threads)
- No audio links displayed

### Data Already Available

From `meta_phrase_info` view:

- `count_cards` - total # of learners who have this card
- `count_active` - # currently learning
- `count_learned` - # who've learned it
- `avg_difficulty` - average difficulty rating
- `avg_stability` - FSRS stability metric

### Data That Needs Querying

**Playlists containing this phrase:**

- Query `playlist_phrase_link` joined with `phrase_playlist`
- Show playlist title, link to playlist page
- Show href (audio/video link) if available

**Comment threads mentioning this phrase:**

- Query `comment_phrase_link` joined with `request_comment` and `phrase_request`
- Show request title/prompt
- Link to request page where comments live

**User's personal stats:**

- Query `user_card` for this phrase
- Show last review date
- Show personal difficulty vs community avg

### Files Impacted

1. `/src/components/cards/big-phrase-card.tsx` - Add metadata display sections
2. `/src/hooks/use-language.ts` or new file - Create hooks for provenance queries:
   - `usePhrasePlaylists(phraseId)`
   - `usePhraseComments(phraseId)`
   - `useUserPhraseStats(phraseId, lang)`
3. `/src/components/phrase-extra-info.tsx` - Possibly extend this component

### Implementation Approach

#### Phase 1: Social Proof Stats (Simple)

Add to big-phrase-card.tsx:

```tsx
<div className="text-muted-foreground flex gap-4 text-sm">
	<Badge variant="secondary">{phrase.count_cards} learners</Badge>
	{phrase.avg_difficulty && (
		<Badge variant="secondary">
			Avg difficulty: {phrase.avg_difficulty.toFixed(1)}/10
		</Badge>
	)}
	{userCard?.last_review_date && (
		<span>Last reviewed: {ago(userCard.last_review_date)}</span>
	)}
</div>
```

#### Phase 2: Playlist Provenance (Moderate)

Create hook:

```typescript
export function usePhrasePlaylists(phraseId: uuid) {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: playlistPhraseLinkCollection })
				.join(phrasePlaylistsCollection, ({ link, playlist }) =>
					eq(link.playlist_id, playlist.id)
				)
				.where(({ link }) => eq(link.phrase_id, phraseId))
				.select(({ playlist, link }) => ({
					id: playlist.id,
					title: playlist.title,
					href: link.href, // audio/video link
				})),
		[phraseId]
	)
}
```

Display:

```tsx
{
	playlists.length > 0 && (
		<Card>
			<CardHeader>
				<CardTitle>Found in Playlists</CardTitle>
			</CardHeader>
			<CardContent>
				{playlists.map((playlist) => (
					<div key={playlist.id}>
						<Link to="/learn/$lang/playlists/$id" params={{ id: playlist.id }}>
							{playlist.title}
						</Link>
						{playlist.href && <PlaylistEmbed href={playlist.href} />}
					</div>
				))}
			</CardContent>
		</Card>
	)
}
```

#### Phase 3: Comment Thread Provenance (Moderate)

Create hook:

```typescript
export function usePhraseComments(phraseId: uuid) {
	return useLiveQuery(
		(q) =>
			q
				.from({ link: commentPhraseLinkCollection })
				.join(requestCommentsCollection, ({ link, comment }) =>
					eq(link.comment_id, comment.id)
				)
				.join(phraseRequestsCollection, ({ comment, request }) =>
					eq(comment.request_id, request.id)
				)
				.where(({ link }) => eq(link.phrase_id, phraseId))
				.select(({ request, comment }) => ({
					requestId: request.id,
					prompt: request.prompt,
					commentId: comment.id,
				})),
		[phraseId]
	)
}
```

Display:

```tsx
{
	comments.length > 0 && (
		<Card>
			<CardHeader>
				<CardTitle>Discussed in Requests</CardTitle>
			</CardHeader>
			<CardContent>
				{comments.map(({ requestId, prompt, commentId }) => (
					<Link
						key={commentId}
						to="/learn/$lang/requests/$id"
						params={{ id: requestId }}
						hash={`#comment-${commentId}`}
					>
						{prompt}
					</Link>
				))}
			</CardContent>
		</Card>
	)
}
```

#### Phase 4: User Personal Stats (Simple)

Query user's card if they have one:

```typescript
const { data: userCard } = useLiveQuery(
	(q) =>
		q
			.from({ card: cardsCollection })
			.where(({ card }) => eq(card.phrase_id, phraseId))
			.findOne(),
	[phraseId]
)
```

Show comparison:

```tsx
{
	userCard && (
		<div className="text-sm">
			Your difficulty: {userCard.difficulty?.toFixed(1) ?? 'N/A'}
			vs Community avg: {phrase.avg_difficulty?.toFixed(1)}
		</div>
	)
}
```

### Layout Suggestion

```
┌─────────────────────────────────┐
│ Phrase Text                     │
│ Translations                    │
├─────────────────────────────────┤
│ 📊 Social Proof                 │
│ • 156 learners                  │
│ • Avg difficulty: 5.2/10        │
│ • Your difficulty: 4.8/10       │
│ • Last reviewed: 2 days ago     │
├─────────────────────────────────┤
│ 📝 Found in Playlists (2)       │
│ • Essential Greetings 🔊        │
│ • Travel Phrases                │
├─────────────────────────────────┤
│ 💬 Discussed in Requests (1)    │
│ • How to say hello formally?    │
└─────────────────────────────────┘
```

### Questions for Human Manager:

1. Should we show ALL playlists/comments, or limit to top 5 with "show more"?
2. Do we want to show who added the phrase to each playlist?
3. Should provenance sections be collapsed by default (accordion)?
4. Priority: Social proof stats OR provenance first?

### Estimated Difficulty: 2

- Data mostly exists in views/tables
- Need to create 2-3 new hooks
- UI layout is straightforward
- No complex state management
- May need to optimize queries for performance

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

## ANALYSIS

### Current Implementation

- No dashboard exists
- No admin role in auth system
- User roles limited to `user_role` enum in metadata (curious/learner/helper)
- No analytics tracking tables
- `user_client_event` table exists for event tracking (structure TBD)

### Security Requirements (Critical)

**Option A: Supabase Service Role Key (Simplest, Less Secure)**

- Dashboard uses service role key (bypasses RLS)
- Only accessible on server-side or in protected routes
- Risk: If compromised, full database access

**Option B: Custom Admin Role (Recommended)**

1. Add `is_admin` boolean to `auth.users` metadata or separate `admin_users` table
2. Create RLS policies that check admin status
3. Admin-only views aggregate data without exposing PII
4. More granular control, better security posture

### Required Data Sources

**1. User Activity Metrics**

- Query `user_client_event` or `auth.users` last_sign_in_at
- Count distinct users by date ranges
- DAU = users active today
- WAU = users active in last 7 days
- MAU = users active in last 30 days

**2. Signup & Churn**

- Query `auth.users.created_at` for new signups
- Define "active" = reviewed cards or created content in last 30 days
- Churned = previously active but not active in last 30 days

**3. Deck Creation**

- Query `user_deck.created_at`
- Count by language
- Show distribution over time

**4. Review Activity**

- Query `user_card_review`
- Count reviews per day
- Average reviews per user
- Most active users

**5. Social Activity**

- Query phrase_request, phrase_playlist, request_comment
- Count creations by type
- Compare social activity vs review activity

### Files Impacted

**Backend (SQL):**

1. New migration: `add_admin_role.sql`
   ```sql
   -- Option: Add admin flag to metadata
   -- Option: Create admin_users table with RLS
   -- Create admin-only views for analytics
   ```
2. Create database views or RPC functions for analytics:
   - `admin_get_user_activity(start_date, end_date)`
   - `admin_get_signup_stats()`
   - `admin_get_review_stats()`

**Frontend:**

1. New route: `/src/routes/_user/admin/dashboard.tsx`
2. Auth check in beforeLoad: verify admin status
3. Components:
   - `/src/components/admin/user-activity-chart.tsx` (reuse existing chart component)
   - `/src/components/admin/recent-signups-table.tsx`
   - `/src/components/admin/stats-cards.tsx`

### Implementation Approach (Proof of Concept)

#### Phase 1: Admin Role Setup (Critical)

```sql
-- Create admin table
create table if not exists public.admin_users (
	uid uuid primary key references auth.users (id),
	created_at timestamptz default now(),
	granted_by uuid references auth.users (id)
);

-- RLS: Only admins can read this table
create policy "Admins can view admin list" on admin_users for
select
	using (
		auth.uid () in (
			select
				uid
			from
				admin_users
		)
	);

-- Helper function
create or replace function public.is_admin (user_id uuid) returns boolean as $$
  select exists(select 1 from admin_users where uid = user_id);
$$ language sql security definer;
```

#### Phase 2: Analytics Views (Read-only)

```sql
create or replace view admin_daily_active_users as
select
	date_trunc('day', created_at) as date,
	count(distinct uid) as active_users
from
	user_client_event
where
	created_at >= now() - interval '30 days'
group by
	date_trunc('day', created_at)
order by
	date desc;

-- RLS on view
alter view admin_daily_active_users owner to postgres;

grant
select
	on admin_daily_active_users to authenticated;

create policy "Only admins can view analytics" on admin_daily_active_users for
select
	using (is_admin (auth.uid ()));
```

#### Phase 3: Dashboard Route & UI

```tsx
export const Route = createFileRoute('/_user/admin/dashboard')({
	beforeLoad: async ({ context }) => {
		// Check admin status
		const { data } = await supabase.rpc('is_admin', {
			user_id: context.auth.userId,
		})
		if (!data) {
			throw redirect({ to: '/' })
		}
		return { titleBar: { title: 'Admin Dashboard' } }
	},
	component: AdminDashboard,
})

function AdminDashboard() {
	// Fetch analytics data
	const { data: dailyUsers } = useQuery({
		queryKey: ['admin', 'daily-users'],
		queryFn: async () => {
			const { data } = await supabase.from('admin_daily_active_users').select()
			return data
		},
	})

	return (
		<div className="space-y-6">
			<h1>Admin Dashboard</h1>

			<div className="grid grid-cols-4 gap-4">
				<StatsCard title="DAU" value={stats.dau} />
				<StatsCard title="WAU" value={stats.wau} />
				<StatsCard title="MAU" value={stats.mau} />
				<StatsCard title="New This Week" value={stats.newSignups} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Daily Active Users</CardTitle>
				</CardHeader>
				<CardContent>
					<ActivityChart data={dailyUsers} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent Signups</CardTitle>
				</CardHeader>
				<CardContent>
					<RecentSignupsTable data={recentSignups} />
				</CardContent>
			</Card>
		</div>
	)
}
```

#### Phase 4: Manual Admin Grant (Initial Setup)

```sql
-- Manually add your account as admin via SQL
insert into
	admin_users (uid)
values
	('your-user-id-here');
```

### MVP Features (Proof of Concept)

- ✅ DAU/WAU/MAU display
- ✅ User activity chart (last 30 days)
- ✅ Recent signups table (last 10)
- ✅ Basic review stats (total reviews, avg per user)
- ❌ Churn analysis (nice to have)
- ❌ Cohort analysis (future)
- ❌ Export to CSV (future)

### Questions for Human Manager:

1. Who should be the initial admin(s)? (need user IDs)
2. Should dashboard be publicly accessible (read-only) or fully protected?
3. Do we need user search/lookup functionality in dashboard?
4. Should we track page views with user_client_event, or use last_sign_in_at?
5. Do we want real-time updates or static snapshots?

### Estimated Difficulty: 2 (for POC)

- Admin role setup is critical but straightforward
- Analytics queries are simple SQL aggregations
- UI can reuse existing components (charts, tables)
- Main complexity is security - must ensure no PII leaks
- Testing admin access is manual/tedious
- Production deployment requires secure admin management

**Note**: Complexity increases to 3-4 if we add:

- User impersonation
- Feature flags management
- Content moderation tools
- Advanced analytics (cohorts, funnels)

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
