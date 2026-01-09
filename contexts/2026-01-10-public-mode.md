# Project Doc: Public Mode

## Current Status Done/Todo

**Cases To Work On:**

- [ ] "Post comment" attempts to post and then hits an error; probably this whole thing should instead say "you need to log in to comment". Perhaps we should have a second Dialog component that is actually like an Auth'dDialog where it works like RequireAuth. Lots of Auth'd activities take place inside dialogs.
- [ ] Upvote Request attempts and fails, should prompt login.
- [ ] Send Request to Friend opens a dialog which is empty, should be login.
- [ ] The entire Learning Center menu in the sidebar should be either hidden or replaced with a thing like "Sign up to begin learning"
- [ ] The card status heart attempts a mutation and then fails
- [ ] On the big-phrase-card, the "Edit tags" and "Add translation" buttons should prompt login

**Other work to do:**

- [ ] The Home page needs some way to log in and start browsing languages
- [ ] There needs to be some page like perhaps a replacement for the /learn route or a /learn/browse route that un-auth'd people get sent to, which shows alll the active languages and an overview of their contents or their recent feed activity
- [ ] The "Choose a deck" menu is not relevant. Maybe replace it with "Browse a language" and have a looong menu that opens up with top 10 languages in the top section and then all languages below. Maybe a badge for # of learners in that language.
- [ ] When you get intercepted on the add-phrase page and then log in, the sidebar does not update unless you refresh
- [ ] Track down these "expected otherwise" console.logs `We expected a userId here... but got null` -- they are probably signs of a component or route that should have some attention paid to it to see whether things need to be rendered conditionally or have auth checks intercept features, etc.

## Initial Work Overview and Research

### Feature: "Public" mode so you can browse feeds / playlists / requests / phrases without a login

STATUS: READY
COMPLEXITY: 3
DIFFICULTY:

DESCRIPTION FROM HUMAN MANAGER:
This is a self-explanatory feature but implementation may be complex. A bunch of components may need to be hidden when the user is not logged in, or they may need to trigger a dialog "go sign up/log in" when you try to take an action, etc. It's fine to keep the functionality really minimal (nice ever) in "public mode", so hide as often as you want. Some menus will still be wanted, like the native share button, copy link, and all navigations.

NOTE FROM CODING AGENT:

#### ANALYSIS

##### Current Implementation

- All content routes are under `/_user` which requires authentication (src/routes/\_user.tsx:28-43)
- `beforeLoad` checks `context.auth.isAuth` and redirects to `/login` if false
- No public browsing routes exist for feeds, playlists, requests, or phrases
- Public collections (phrases, playlists, requests) already sync for all users

##### Files Impacted

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

##### Implementation Options

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

##### Recommended Approach: Option B

###### Implementation Steps:

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

##### Questions for Human Manager:

1. Should public users be able to view user profiles? (privacy consideration) <Answer>Only public profiles, which they already know will be public.</Answer>
2. Should we show upvote counts in public mode, even if they can't upvote? <Answer>Yes</Answer>
3. Do we want a "Sign up to start learning" CTA on every page, or just in navigation? <Answer>Sure, add it; if I don't like it I'll remove it.</Answer>
4. Should public users be able to see the full phrase translation, or just a preview? <Answer>Show all information. Imagine it's like wikipedia -- even if they're not editors, they should have access to all the info and context.</Answer>

##### Estimated Difficulty: 3

- Requires significant routing changes
- Many components need conditional rendering
- Need to ensure no private data leaks
- Must test all user flows carefully
- Potential RLS policy review needed

LESSONS LEARNED:
