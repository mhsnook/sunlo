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

### Scenetest (preferred)

**Always write new tests as scenetest specs** unless a specific limitation prevents it. Scenetest specs are readable markdown files that describe user journeys at a high level — they're easier to write, easier to review, and keep browser orchestration separate from state assertions.

```bash
# Run all scenetest specs
pnpm scene

# Run a specific scene file
pnpm scene scenetest/scenes/decks.spec.md
```

Scene specs located in `/scenetest/scenes/` directory (`.spec.md` files). Requires the dev server (`pnpm dev`) and Supabase to be running locally. Config is in `scenetest/config.ts`.

**When scenetest isn't enough**: If a user journey can't be expressed in a scene spec (e.g. you need fine-grained browser control, network interception, or multi-tab behavior), you have two options — in either case, **add a comment explaining why scenetest couldn't cover it**:

1. **Scenetest with inline assertions** (`useTestEffect`) — for cases where the scene steps work but you need to verify internal component state or collection data alongside them.
2. **Playwright** — for cases that require low-level browser control that scenetest can't provide at all.

### Testing (Playwright)

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

## Deployment Strategy

We use **trunk-based development with a migration gate** — two deployment tracks, not two long-lived branches.

### The two tracks

| Track                                | Trigger               | Risk profile                       | Ceremony                                      |
| ------------------------------------ | --------------------- | ---------------------------------- | --------------------------------------------- |
| **Fast track** (UI-only)             | PR merges to `main`   | Low blast radius, reversible       | Deploy at will, drop a one-liner in changelog |
| **Migration track** (schema changes) | PR into `next` branch | Expensive to reverse, needs review | Human review gate, batch release notes        |

### Decision rule

> **Does this PR touch a migration file?**
>
> - **No** → merge to `main`, deploy when ready.
> - **Yes** → PR into `next`, hold for review, merge `next` → `main` when the batch is ready.

### Workflow

1. **Feature without migration** → PR → merge to `main` → deploy → one-liner changelog entry (doesn't need to be same day)
2. **Feature with migration** → PR into `next` → accumulates with other migration PRs → human reviews full picture → merge `next` into `main` → deploy → write proper release notes
3. **Version bumps** → only when cutting a `next` → `main` release. Use datestamps (e.g. `2026-03-27`) as release identifiers, not semver. Tag these merges with `git tag`.

### Guidelines

- **Don't let `next` get stale.** If it's been open >2 weeks, either ship it or break the migrations into smaller pieces.
- **Tag `next` → `main` merges** even informally — `git tag` is cheap and makes the deployment log reconstructable.
- **Changelog has two modes**: a running "Recent changes" section for fast-track items, and named/dated release entries for migration-track batches.
- **No semver.** We're not publishing packages. Datestamps or sequential names are sufficient.
- **Ship UI, architect the database.** UI changes should flow fast; schema changes deserve ceremony.

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
Collections (src/features/<domain>/collections.ts)
        ↓
Live Queries (useLiveQuery hooks)
        ↓
React Components
```

**Collections** are the single source of truth for all data. They're defined in each feature's `collections.ts` using `createCollection()` with Zod schemas for validation. Loading strategies:

- Load **whole tables** for user collections (RLS filters automatically)
- Use **on-demand** subsets in live queries for public data

**Live Queries** subscribe to collections reactively. Any collection update automatically triggers component re-renders. Use the `useLiveQuery()` hook to create queries that can:

- Join multiple collections
- Filter with type-safe operators (`eq`, `gte`, `and`, etc.)
- Select specific fields
- Aggregate data

Example:

```typescript
// From features/deck/hooks.ts
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

- `src/features/` - **Feature modules** (schemas, collections, hooks, and barrel files per domain)
  - `profile/` - User profiles, identity, language preferences (`schemas.ts`, `collections.ts`, `hooks.ts`)
  - `languages/` - Language metadata, tags, `LangSchema` (`schemas.ts`, `collections.ts`, `hooks.ts`)
  - `phrases/` - Phrases, translations, search, provenance (`schemas.ts`, `collections.ts`, `live.ts`, `hooks.ts`)
  - `deck/` - Decks, cards, deck mutations (`schemas.ts`, `collections.ts`, `hooks.ts`, `mutations.ts`)
  - `review/` - Review sessions, FSRS algorithm, review store (`schemas.ts`, `collections.ts`, `hooks.ts`, `store.ts`, `fsrs.ts`)
  - `requests/` - Phrase requests & upvotes (`schemas.ts`, `collections.ts`, `hooks.tsx`)
  - `comments/` - Comment system (`schemas.ts`, `collections.ts`)
  - `social/` - Friends, chat, public profiles (`schemas.ts`, `collections.ts`, `live.ts`, `hooks.ts`, `public-profile.ts`)
  - `playlists/` - Playlists & phrase links (`schemas.ts`, `collections.ts`, `hooks.ts`)
  - `feed/` - Activity feed (`schemas.ts`, `hooks.ts`)
  - `contributions/` - User contributions views (`schemas.ts`, `hooks.ts`)
- `src/lib/` - Cross-cutting utilities
  - `collections/clear-user.ts` - Clears all user collections on logout
  - `supabase-client.ts` - Supabase client setup
  - `query-client.ts` - TanStack Query configuration
  - `use-auth.ts` - Authentication state
  - `dayjs.ts`, `utils.ts`, `languages.ts` - Cross-cutting utilities
- `src/hooks/` - Cross-domain composite hooks
  - `composite-phrase.ts`, `composite-pids.ts` - Multi-domain data hooks
  - `use-smart-search.ts` - Search across phrases/requests/playlists
  - `links.ts`, `use-mobile.tsx`, `use-require-auth.ts` - Utility hooks
- `src/routes/` - File-based routing structure
  - `_auth.tsx` - Auth layout (login, signup)
  - `_user.tsx` - Protected routes requiring authentication
  - `_user/learn/$lang.*` - Language-specific learning features
- `src/components/` - React components
  - `ui/` - Base Radix UI primitives (button, dialog, etc.)
  - `feed/` - Feed display components
  - `cards/`, `requests/`, `playlists/` - Feature-specific components
  - `fields/` - Reusable form field components
- `supabase/schemas/` - Database schema definitions
- `supabase/migrations/` - Database migrations
- `supabase/seed.sql` - Seed data

### Feature Module Pattern

The codebase uses a **"deep module" architecture** (inspired by Ousterhout's _A Philosophy of Software Design_). Each feature domain is a self-contained directory under `src/features/` containing its own schemas, collections, hooks, and a barrel file (`index.ts`) that exports the public API.

**Directory structure per feature:**

```
src/features/<domain>/
  schemas.ts      — Zod schemas and inferred types
  collections.ts  — TanStack DB collections
  hooks.ts        — React hooks (useLiveQuery, useMutation)
  index.ts        — Barrel file (public API re-exports)
  # Some features also have:
  live.ts         — Live query definitions (phrases, social)
  mutations.ts    — Mutation hooks (deck)
  store.ts        — Zustand store (review)
  fsrs.ts         — FSRS algorithm (review)
```

**Import conventions:**

```typescript
// ✅ Consumer code (routes, components) — import from the barrel
import { useDeckMeta, type DeckMetaType } from '@/features/deck'
import { useLanguagePhrases } from '@/features/phrases'

// ✅ Cross-domain wiring (one feature importing from another) — import from specific files
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'

// ✅ Intra-feature imports — use relative paths
import { CardReviewSchema } from './schemas'
import { cardReviewsCollection } from './collections'
```

**Feature domains and what they contain:**

| Domain          | Schemas                                 | Collections                                         | Key Hooks                              |
| --------------- | --------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| `profile`       | PublicProfile, MyProfile, LanguageKnown | publicProfiles, myProfile                           | useAuth, useProfile                    |
| `languages`     | Language, LangTag, LangSchema           | languages, langTags                                 | useLanguageMeta, useLanguageTags       |
| `phrases`       | PhraseFull, Translation, PhraseSearch   | phrases, phrasesFull (live)                         | useLanguagePhrases, usePhrase          |
| `deck`          | DeckMeta, CardMeta                      | decks, cards                                        | useDeckMeta, useDeckCards, useDeckPids |
| `review`        | CardReview, DailyReviewState            | cardReviews, reviewDays                             | useReviewsToday, useReviewMutation     |
| `requests`      | PhraseRequest                           | phraseRequests                                      | useRequest, useRequestCounts           |
| `comments`      | RequestComment, CommentPhraseLink       | comments, commentPhraseLinks                        | (inline in components)                 |
| `social`        | FriendSummary, ChatMessage              | friendSummaries, chatMessages, relationsFull (live) | useRelationFriends, useAllChats        |
| `playlists`     | PhrasePlaylist, PlaylistPhraseLink      | phrasePlaylists, playlistPhraseLinks                | useOnePlaylist, useLangPlaylists       |
| `feed`          | FeedActivity                            | (uses React Query)                                  | useFeedLang                            |
| `contributions` | UserContributionsTabs                   | (uses other collections)                            | useAnyonesPhraseRequests               |

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
- **Hooks**: Feature hooks live in `features/<domain>/hooks.ts`; cross-cutting hooks in `src/hooks/` use `use-` prefix
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
// Feature public API (preferred for consumer code)
import { useDeckMeta, type DeckMetaType } from '@/features/deck'
import { useLanguagePhrases } from '@/features/phrases'

// Feature internals (for cross-domain wiring)
import { decksCollection } from '@/features/deck/collections'
import { DeckMetaSchema } from '@/features/deck/schemas'

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

### tailwind-oklch Color System

This project uses the **tailwind-oklch** plugin for composable, auto-flipping OKLCH colors. Every color is built from three axes: **luminance contrast** (L), **chroma** (C), and **hue** (H).

#### Shorthand syntax (preferred when setting all three axes)

```
{prop}-{L}-{C}-{H}
```

Examples:

```typescript
// Background: luminance 1, chroma mlo, hue primary
className = 'bg-1-mlo-primary'

// Text: luminance 6, chroma hi, hue info
className = 'text-6-hi-info'

// Border: luminance 4, chroma mid, hue danger
className = 'border-4-mid-danger'

// Works with variants:
className = 'hover:bg-2-mlo-info'
```

**Always use the shorthand** when setting all three axes. Only use decomposed form (`bg-lc-* bg-c-* bg-h-*`) when overriding a single axis or using adjustment utilities.

#### Luminance contrast scale (L)

The 0–10 scale auto-flips between light and dark mode:

| Value         | Light mode        | Dark mode         | Meaning          |
| ------------- | ----------------- | ----------------- | ---------------- |
| `0` / `base`  | 0.95 (near white) | 0.12 (near black) | Blends with page |
| `1`           | 0.87              | 0.20              | Subtle tint      |
| `5`           | 0.55              | 0.52              | Mid-contrast     |
| `7`           | 0.39              | 0.68              | Prominent        |
| `10` / `fore` | 0.15 (near black) | 0.92 (near white) | Maximum contrast |
| `none`        | 1.0 (white)       | 0.0 (black)       | Beyond base      |
| `full`        | 0.0 (black)       | 1.0 (white)       | Beyond fore      |

#### Chroma stops (C)

| Name  | Value | Use for                            |
| ----- | ----- | ---------------------------------- |
| `lo`  | 0.02  | Backgrounds, muted surfaces        |
| `mlo` | 0.06  | Tinted backgrounds, subtle borders |
| `mid` | 0.12  | Medium saturation                  |
| `mhi` | 0.18  | Prominent accents                  |
| `hi`  | 0.25  | Vivid, saturated colors            |

#### Available hues (H)

`primary` (300), `accent` (175), `neutral` (270), `success` (145), `warning` (55), `danger` (15), `info` (220)

#### Adjustment utilities (single-axis overrides)

Use these when you need to nudge ONE axis, inheriting the others from a parent or shorthand:

```typescript
// Adjust luminance: more contrast (+) or less contrast (-)
className = 'bg-1-mlo-primary group-hover:bg-lc-up-1'

// Override just the hue on a child element
className = 'bg-h-accent'

// Override just the chroma
className = 'text-c-hi'
```

#### Semantic color tokens

Defined in `globals.css`, these bridge the tailwind-oklch scale with traditional Tailwind tokens:

| Token                                  | Definition                | Notes                                                                 |
| -------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| `primary`                              | L=5, C=hi, hue-primary    | Auto-flips via plugin                                                 |
| `primary-foresoft`                     | L=7, C=hi, hue-primary    | Auto-flips; the "interactive purple" for links, soft buttons, borders |
| `primary-foreground`                   | Fixed L=0.93              | Always near-white — for text ON primary surfaces only                 |
| `accent` / `accent-foresoft`           | L=5/7, C=hi, hue-accent   | Auto-flips                                                            |
| `accent-foreground`                    | L=fore, C=mlo, hue-accent | Auto-flips; used as body text (language names)                        |
| `foreground`, `muted-foreground`, etc. | Static per-mode           | Defined in `:root` and `.dark` blocks                                 |

#### When to use what

- **Semantic tokens** (`text-primary`, `bg-card`, `border-border`): For UI primitives that use the same color everywhere
- **Shorthand** (`bg-1-mlo-info`): For one-off colored elements — icon backgrounds, tinted surfaces, status indicators
- **Decomposed** (`bg-lc-up-1`, `text-c-hi`): For hover/focus adjustments or overriding one axis of an inherited color
- **Avoid `dark:` prefixes** — the oklch scale and semantic tokens auto-flip. Only use `dark:` for truly exceptional cases (e.g. marketing page with custom gradient backgrounds)
- **Avoid opacity-based tints** (`bg-primary/10`) — use luminance steps instead (`bg-1-mlo-primary`) for consistent appearance across monitors

### Styling Conventions

- Use `cn()` function for conditional class name concatenation
- Use **"start" and "end"** instead of "left" and "right" for RTL support
- Use `@container` queries when relevant for component portability across different-sized containers
- **Use standard Tailwind classes** instead of arbitrary values when a standard class exists (e.g. use `z-50` not `z-[50]`, `z-100` not `z-[100]`)
- **Border radius**:
  - Interactive elements (links, buttons, inputs): `rounded-2xl`
  - Non-interactive elements (cards): `rounded`

### Base UI Data Attributes

This project uses `@base-ui/react` (NOT Radix) for low-level primitives. Base UI uses different data attributes than Radix:

- **Tabs**: Selected tab gets `data-active` (use `data-[active]:` in Tailwind). NOT `data-selected` or `data-state="active"`.
- **Select**: Similar pattern — check Base UI docs for the correct attribute names before styling.
- Always verify the actual data attribute names in `node_modules/@base-ui/react/esm/` type definition files when creating or modifying UI components.

### Component Styling Patterns

```typescript
// Links styled as buttons
<Link to="/path" className={buttonVariants({ variant: "default" })}>Go</Link>

// Links styled as links
<Link to="/path" className="s-link">Go</Link>

// Always use generic components for consistency
<Input /> <Textarea /> <Button />
```

### Button Variants

We use a deliberate set of button variants. Choose based on the action's role, not its visual weight:

| Variant            | Role                                                                         | Example uses                                                                                              |
| ------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `default`          | **Primary action** — the thing you most want the user to do                  | Save, Submit, Create account, Confirm                                                                     |
| `neutral`          | **Paired counterpart** to default or red — cancel, go back, reset            | Cancel, Go back, Reset, Dismiss                                                                           |
| `soft`             | **Optional initiation** — opens a flow the user may choose to start          | "Show translations", "Add to deck" (collapsible triggers, dialog openers that lead to a save/cancel pair) |
| `ghost`            | **Ambient/utility actions** — always available but not calling for attention | Icon buttons (edit, delete, share, copy), toolbar actions, nav toggles                                    |
| `red` / `red-soft` | **Destructive primary action** — paired with `neutral` for cancel            | Archive, Delete (confirmation dialogs)                                                                    |

**Key principles:**

- **Default + neutral** is the standard button pair for forms and confirmation dialogs
- **Red + neutral** replaces default + neutral when the primary action is destructive
- **Soft** is for _optionally initiating_ a secondary flow (e.g. opening a dialog that itself has default/neutral buttons inside). It sits between ghost and default in visual weight
- **Ghost** is the workhorse for icon buttons and utility actions. Use it for anything that should be tappable but visually quiet
- **Ghost → soft for active state**: When a ghost button has a toggle/active state (e.g. bookmark saved, filter active), switch to `soft` to indicate the active state:
  ```typescript
  variant={isActive ? 'soft' : 'ghost'}
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
