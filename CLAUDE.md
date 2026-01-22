# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables and populate with Supabase outputs
cp .env.example .env

# Start Supabase (requires Docker Desktop and Supabase CLI)
supabase start

# Reset database with migrations and seeds
supabase db reset
```

### Development

```bash
# Start dev server (runs on http://127.0.0.1:5173)
pnpm dev

# Type checking
pnpm check

# Linting (runs oxlint then eslint)
pnpm lint

# Format code
pnpm format
pnpm format:check
```

### Testing

```bash
# Run all e2e tests (Playwright)
pnpm test

# Run tests with UI
pnpm test:ui

# Run specific test file
npx playwright test e2e/mutations/decks.spec.ts

# Run tests for single browser
npx playwright test --project=chromium
```

Test files located in `/e2e/` directory. Tests require Supabase to be running locally.

### Database Management

```bash
# Create migration from local changes
pnpm run migrate

# Regenerate TypeScript types from database schema
pnpm run types

# Regenerate base schema file (curate before committing!)
pnpm run seeds:schema

# Dump current seed data
pnpm run seeds:data

# Apply seeds
pnpm run seeds:apply
```

**Important**: When regenerating `base.sql` and `seed.sql`, be careful not to commit unintended deletions (like realtime table configurations). Always review the diff carefully.

### Database Workflow

1. Use Supabase Studio (http://localhost:54323) to modify schema/data
2. When feature works, run `pnpm run migrate` to create migration
3. Run `pnpm run seeds:schema` to update base.sql (review carefully!), update supabase types, run formatter
4. Run `pnpm run types` to regenerate TypeScript types

## Architecture Overview

### Philosophy

- **Local First Approach:** Get the most out of Tanstack DB. Use `collection.insert` when possible, prefer live queries to postgres views, always return full objects from RPCs.
- **RLS-Backed:** Privacy is handled directly in the DB, so we must be very sure of our work on RLS, and then the client can do whatever it wants with the worst case being "broken component / error in UI" rather than leaked data.
- **Container Queries:** We use tailwind's @container and container queries like `@lg:class-name` so that our components remain composable and portable.

### Tech Stack

- **Frontend**: React 19 + TypeScript 5.8+ + Vite + React Compiler
- **Language**: Concise, functional TypeScript with latest ECMAScript features
- **Routing**: TanStack Router (file-based)
- **Data Management**: TanStack DB Collections + TanStack Query
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage + RPC)
- **Validation**: Zod schemas
- **Forms**: react-hook-form with zodResolver
- **UI**: ShadCN UI + Tailwind CSS
- **Package Manager**: PNPM
- **Linting**: oxlint (fast) + eslint (thorough)
- **Git Hooks**: husky + lint-staged for pre-commit checks
- **Dev Tools**: React Query Devtools + Router Devtools

### Data Flow Pattern

This app uses a **reactive collection-based architecture** instead of traditional REST or GraphQL patterns:

```
Supabase Database
        ↓
Collections (src/lib/collections.ts)
        ↓
Live Queries (useLiveQuery hooks)
        ↓
React Components
```

**Collections** are the single source of truth for all data. They're defined in `src/lib/collections.ts` using `createCollection()` with Zod schemas for validation. Loading strategies:

- Load **whole tables** for user collections (RLS filters automatically)
- Use **on-demand** subsets in live queries for public data

**Live Queries** subscribe to collections reactively. Any collection update automatically triggers component re-renders. Use the `useLiveQuery()` hook to create queries that can:

- Join multiple collections
- Filter with type-safe operators (`eq`, `gte`, `and`, etc.)
- Select specific fields
- Aggregate data

Example:

```typescript
// From hooks/use-deck.ts
export const useDeckCards = (lang: string) =>
	useLiveQuery(
		(q) =>
			q
				.from({ card: cardsCollection })
				// ❌ incorrect: `.join(phraseFull, ...)
				// ✅ correct: `.join({ phrase: phraseFull }, ...)`
				.join({ phrase: phraseFull }, ({ card, phrase }) =>
					eq(card.phrase_id, phrase.id)
				)
				.where(({ card }) => eq(card.lang, lang)),
		[lang]
	)
```

### Mutations Pattern

**Always use `useMutation`** for any server state changes (including login/logout), even when there's no form.

Standard approach:

1. Return updated/inserted rows from mutation with `.select()`
2. Update local collection in `onSuccess` with `utils.writeInsert/writeUpdate`
3. For complex server-side changes, use `invalidateQueries()` instead

Two update patterns:

1. **Direct collection updates** (optimistic UI):

```typescript
phrasePlaylistsCollection.utils.writeInsert(PhrasePlaylistSchema.parse(data))
```

2. **React Query mutations** (typical pattern):

```typescript
const mutation = useMutation({
	mutationFn: async (values) => {
		const { data } = await supabase
			.from('phrase')
			.insert(values)
			.select() // Always return the data
			.throwOnError()
		return data[0]
	},
	onSuccess: (data) => {
		phrasesCollection.utils.writeInsert(PhraseSchema.parse(data))
		toast.success('Created!')
	},
	onError: (error) => {
		toast.error('Failed to create')
		console.log('Error', error)
	},
})
```

### Key Directories

- `src/routes/` - File-based routing structure
  - `_auth.tsx` - Auth layout (login, signup)
  - `_user.tsx` - Protected routes requiring authentication
  - `_user/learn/$lang.*` - Language-specific learning features
- `src/components/` - React components
  - `ui/` - Base Radix UI primitives (button, dialog, etc.)
  - `feed/` - Feed display components
  - `cards/`, `requests/`, `playlists/` - Feature-specific components
  - `fields/` - Reusable form field components
- `src/hooks/` - Custom React hooks (use-deck, use-requests, etc.)
- `src/lib/` - Core utilities and configuration
  - `collections.ts` - All TanStack DB collections
  - `live-collections.ts` - Computed/joined collection views
  - `schemas.ts` - Zod validation schemas
  - `supabase-client.ts` - Supabase client setup
  - `query-client.ts` - TanStack Query configuration
  - `use-auth.ts` - Authentication state
- `supabase/schemas/` - Database schema definitions
- `supabase/migrations/` - Database migrations
- `supabase/seed.sql` - Seed data

### Routing Conventions

Routes use TanStack Router's file-based system:

- `$lang` parameter = dynamic language code (e.g., "tam", "spa")
- `_auth` prefix = auth layout (pages relating to auth workflows)
- `_user` prefix = protected layout (auth required)
- `.lazy` suffix = lazy-loaded route
- `.index` suffix = index route

Route context includes:

```typescript
interface MyRouterContext {
	auth: AuthState
	queryClient: QueryClient
	titleBar?: TitleBar
	appnav?: string[]
	contextMenu?: string[]
}
```

Use `beforeLoad` and `loader` hooks to:

- Set page metadata (title, subtitle, etc.)
- Define navbar title and icons
- Pass links for app-nav and context menu
- Directly pass second sidebar if required

### Authentication

Auth state managed in `src/lib/use-auth.ts` via `AuthProvider`:

- Listens to Supabase `onAuthStateChange` events
- Clears user collections on sign-out
- Preloads user profile on sign-in

Access auth state:

```typescript
const { auth } = Route.useRouteContext()
// auth.isAuth, auth.userId, auth.userEmail, auth.userRole
```

### Collection Types

**Public collections** (`startSync: true`):

- Phrases, playlists, requests, public profiles
- Synced automatically for all users

**User collections** (`startSync: false`):

- Cards, decks, reviews, chat messages, friend summaries
- Only synced when user is authenticated
- Cleared on logout

### Realtime Patterns

For friend requests and chat messages, use `useEffect` to subscribe:

```typescript
useEffect(() => {
	const channel = supabase
		.channel('chat_messages')
		.on(
			'postgres_changes',
			{
				event: 'INSERT',
				schema: 'public',
				table: 'chat_message',
			},
			(payload) => {
				chatMessagesCollection.utils.writeInsert(
					ChatMessageSchema.parse(payload.new)
				)
			}
		)
		.subscribe()

	return () => {
		supabase.removeChannel(channel)
	}
}, [])
```

### Seed Data Conventions

All seed data uses relative date calculations from `current_date`:

```sql
created_at = current_date - 4 + interval '2 minute' day_session = (current_date - 4 + interval '2 minute' - interval '4 hour')::date
```

This ensures seed data remains relevant (cards "created 4 days ago" are always 4 days old). When modifying seeds, maintain this pattern for dates.

## Code Style & Conventions

### Formatting

- Use **tabs** instead of spaces (enforced by prettier.config.mjs)
- Run `pnpm format` before committing

### Naming Conventions

- **Variables**: camelCase (e.g., `userProfile`, `deckCards`)
- **Zod schemas**: PascalCase (e.g., `PhraseFullSchema`, `DeckMetaSchema`)
- **Database fields**: snake_case to match Postgres (e.g., `created_at`, `phrase_id`)
- **Components**: PascalCase, files are kebab-case (e.g., `UserProfile` in `user-profile.tsx`)
- **Hooks**: Prefix with `use-` (e.g., `use-deck.ts`, `use-requests.tsx`)
- **Language codes**: Use `lang` variable name for 3-letter codes
- **Phrase IDs**: Use `pid` when passing phrase_id as prop or variable
- **Type definitions**: Files with only TypeScript definitions use `*.d.ts` extension

### TypeScript Conventions

- Prefer `Array<SomeType>` over `SomeType[]` for readability at start of line
- Auto-generated types from Supabase: `@/src/types/supabase.ts`
- Utility types that wrap/combine Supabase types: `@/src/types/main.ts`
- All IDs use `uuid` type (alias for `string` defined in `main.ts`)

### Import Patterns

```typescript
// Supabase client
import supabase from '@/lib/supabase-client'

// Components
import { Button } from '@/components/ui/button'
import UserProfile from '@/components/user-profile'

// Lib functions
import { todayString } from '@/lib/dayjs'
```

### Important Conventions

- **Date handling**: Use `todayString()` helper which uses 4am cutoff (not midnight) for day boundaries. Use `dayjs` helpers like `ago()` for display.
- **Path aliases**: Always use `@/` prefix for imports
- **Type naming**: Zod schemas generate types with `Type` suffix (e.g., `PhraseFullSchema` → infer as `PhraseFullType`)
- **Query keys**: Use array format matching collection IDs (e.g., `['public', 'phrase_full']`)
- **Collection keys**: Always define `getKey` as `(item) => item.id` for proper indexing

## Styling with Tailwind CSS

### Custom Theme

- Custom colors defined in `@/src/styles/globals.css`
- **`primary-foresoft`**: Light purple that works in both themes, often used with `/30` opacity modifier
- **Responsive colors**: Use `foreground` to darken, `background` to lighten
- **Avoid `dark:` and `light:` prefixes** - use theme-responsive color codes for consistency

### Styling Conventions

- Use `cn()` function for conditional class name concatenation
- Use **"start" and "end"** instead of "left" and "right" for RTL support
- Use `@container` queries when relevant for component portability across different-sized containers
- **Border radius**:
  - Interactive elements (links, buttons, inputs): `rounded-2xl`
  - Non-interactive elements (cards): `rounded`

### Component Styling Patterns

```typescript
// Buttons
<Button variant="default">Click me</Button>

// Links styled as buttons
<Link to="/path" className={buttonVariants({ variant: "default" })}>Go</Link>

// Links styled as links
<Link to="/path" className="s-link">Go</Link>

// Always use generic components for consistency
<Input /> <Textarea /> <Button />
```

## Component Conventions

### UI Components

- Base components from ShadCN UI (Radix UI + Tailwind) in `@/components/ui/`
- Always use generic components like `<Input>`, `<Textarea>`, `<Button>` for visual consistency
- Toasts: Use `react-hot-toast` with `toast.success()` and `toast.error()`

### Data Fetching in Components

- Use custom hooks like `useDeck()`, `useLanguage()` for reusable queries
- Also fine to write `useLiveQuery` directly in components for one-off needs
- Collection query functions usually only fetch the item itself (joins happen in live queries)

## Database Conventions

### Schema Patterns

- **Primary keys**: Always UUID with `id uuid default gen_random_uuid() not null`
- **Table names**: Singular (e.g., `phrase` not `phrases`)
- **Timestamps**: Use `created_at timestamp with time zone default now() not null`
- **User data**: Private tables use `uid` field with Row Level Security (RLS)

### Row Level Security (RLS)

- Never expose tables with `uid` field without RLS
- RLS filters data automatically - can load whole tables for user collections
- Create public views for shared data, carefully vet what's exposed
- Use explicit `uid` checks in queries for faster query planning:
  ```typescript
  .eq('uid', userId!)
  ```

### User Data Management

- **Profile data**: Attach to Profile table (username, avatar, preferred languages)
- **User metadata**: Only use `user.user_metadata` for UI-critical fields (currently just `user_role`)
- Always validate user owns data before mutations

## TanStack DB Collection Patterns

### Loading Strategies

- **Whole table loading**: Use for user tables where RLS filters automatically
- **On-demand loading**: Define subsets in live queries themselves for public data
- Collections provide the base data, live queries handle joins and filtering

### Collection Query Functions

```typescript
// Typical pattern - fetch base data only
queryFn: async () => {
	const { data } = await supabase.from('phrase').select('*')
	return data?.map((p) => PhraseSchema.parse(p)) ?? []
}
```

Joins happen in live queries, not in collection queryFn. This keeps collections focused and composable.

## Forms & Mutation Patterns

### Standard Form Pattern

1. Define Zod schema for validation
2. Create form with `useForm({ resolver: zodResolver(Schema) })`
3. Create mutation with full typing
4. Handle submit with `handleSubmit((data) => mutation.mutate(data))`
5. Show error alert when `formState.errors` exists
6. Toast on success/error

### Mutation Best Practices

- **Always use `useMutation`** for any server state changes (including login/logout)
- **Return updated/inserted rows** from mutations with `.select()`
- **Update local collections** in `onSuccess` using `collection.utils.writeInsert/writeUpdate`
- Use `toast.success()` in onSuccess, `toast.error()` and `console.log('Error', error)` in onError
- For complex server-side updates, it's fine to just `invalidateQueries()` instead

### Complete Mutation Example

```typescript
const mutation = useMutation<DeckRow, PostgrestError, DeckGoalFormInputs>({
	mutationKey: ['user', lang, 'deck', 'settings', 'goal'],
	mutationFn: async (values) => {
		const { data } = await supabase
			.from('user_deck')
			.update(values)
			.eq('lang', lang)
			.eq('uid', userId!)
			.throwOnError()
			.select()
		return data[0]
	},
	onSuccess: (data) => {
		toast.success('Deck settings updated!')
		decksCollection.utils.writeUpdate(DeckMetaRawSchema.parse(data))
	},
	onError: (error) => {
		toast.error('Update failed')
		console.log('Error', error)
	},
})
```

## Testing Conventions

### Playwright E2E Tests

- Test files in `/e2e/` directory
- **NEVER use `page.goto()`** - it bypasses TanStack Router and breaks cache
- Create reusable navigation functions in `goto-helpers.ts`

#### Navigate through the UI

Using buttons and links; never use `goto` (except in the very first part of the script) because we need to know that the cache is updating correctly, and a `goto` will cause a full refetch of all data.

```typescript
// ✅ Correct - preserves router state
await page.getByTestId('app-nav-menu').getByTestId('nav-link--feed').click()

// ❌ Wrong - breaks router cache
await page.goto('/learn/hin/feed')
```

## Use UI Semantics for Test Selectors

When writing tests, instead of using names or exacty display text for the user, use testids like "affirm-community-norms-button", and add them into the markup as a cue that will help devs understand the purpose and expectations for the page they're working with.

```
		// Dialog should close and we should see the welcome content
		await expect(welcomeHeader).toBeVisible({ timeout: 5000 })

		// ✅🙌 using UI semantics
		await expect(page.getByTestId('sunlo-welcome-explainer')).toBeVisible()

		// ❌🙅 using exact page text
		await expect(page.getByText('What is Sunlo?')).toBeVisible()

```

## Additional Libraries

- **@uidotdev/usehooks** - Additional React hooks beyond custom ones
- **zustand** v5 - Lightweight state management (currently used in Review interface)
- **dayjs** - Date manipulation (lighter alternative to moment.js)
- **recharts** - Data visualization components
- **react-hot-toast** - Toast notifications
- **lucide-react** - Icon library

### Feed System

The feed uses infinite queries with pagination:

- `useFeedLang()` hook fetches feed activities
- `useInvalidateFeed()` manually resets feed cache after mutations
- Feed types: 'request', 'playlist', 'phrase'
- Client-side folding removes child phrases from feed (see `$lang.feed.tsx`)

### View Transitions

Enable smooth page transitions with CSS view transitions:

```typescript
const style = { viewTransitionName: 'main-area' } as CSSProperties
```

### Query Configuration

Default query settings (from `query-client.ts`):

- `staleTime`: 2 minutes
- `gcTime`: 20 minutes
- `refetchOnWindowFocus`: false
- `refetchOnMount`: false

Collections handle most caching, so these are relatively conservative.

## Project Context

Sunlo is a language learning app combining:

- Spaced repetition flashcards (FSRS algorithm)
- Social features (friends, chat, sharing)
- User-generated content (phrases, playlists, translation requests)
- Activity feed showing community contributions

The architecture prioritizes real-time reactivity, type safety, and normalized data management using TanStack tools rather than traditional state management libraries.
