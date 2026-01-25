# Scenetest Integration for Sunlo

This directory contains Scenetest scene specs converted from our existing Playwright E2E tests.

## Files

- `scenes.ts` - Scene specs describing user journeys
- `TEST_IDS.md` - Comprehensive list of data-testid attributes needed
- `README.md` - This file

## Philosophy

Scenetest separates testing into two concerns:

1. **Scene specs** (browser orchestration) - Describe user journeys at a high level using test IDs
2. **Inline assertions** (component state verification) - Engineers add assertions directly in components using `useTestEffect`

This approach means:

- Scene specs are readable by non-engineers (product, design)
- State verification happens where the state lives (in components)
- No "reverse server action" pattern of exfiltrating data via `window.__collection`

## API Extensions Used

The scene specs assume some API methods that may not exist in Scenetest core yet:

### Actor Methods

```typescript
// Navigation
await user.goto('/path') // Navigate to URL (exists)

// Element visibility
await user.seeId('test-id') // Wait for data-testid to be visible
await user.notSeeId('test-id') // Verify element is NOT visible
await user.seeText('text') // Wait for text to be visible

// Interactions
await user.clickId('test-id') // Click element by data-testid
await user.typeInto('test-id', 'text') // Type into input by data-testid

// Scrolling
await user.scrollToBottom() // Scroll to bottom of page

// Toasts - waits for toast to appear AND disappear (prevents false positives)
await user.seeToast('toast-success') // Wait for toast lifecycle
await user.seeToast('toast-error')
```

### Cast with Fixtures

```typescript
// Create actor with test data fixtures
const learner = await cast('learner', { fixtures: ['owned-playlist'] })
```

The fixtures would set up test data before the scene runs (e.g., creating a playlist owned by the test user).

## Mapping from Playwright

| Playwright                                                | Scenetest                     |
| --------------------------------------------------------- | ----------------------------- |
| `page.goto('/path')`                                      | `user.goto('/path')`          |
| `page.getByTestId('id').click()`                          | `user.clickId('id')`          |
| `page.getByTestId('id')`                                  | `user.seeId('id')`            |
| `page.fill('[data-testid="id"]', 'text')`                 | `user.typeInto('id', 'text')` |
| `expect(locator).toBeVisible()`                           | `user.seeId('id')`            |
| `expect(locator).not.toBeVisible()`                       | `user.notSeeId('id')`         |
| `expect(page.getByText('x')).toBeVisible()`               | `user.seeText('x')`           |
| `expect(page.getByTestId('toast-success')).toBeVisible()` | `user.seeToast('success')`    |

## What Moved to Inline Assertions

The Playwright tests had many assertions checking:

- Data in `window.__collection` (local TanStack DB collections)
- Data in the database (via `supabase` client)
- Matching between collection and database

In Scenetest, these would become inline assertions in the components:

```typescript
// In component code
useTestEffect(() => {
	const localDeck = decksCollection.get(lang)

	assert(
		'deck matches server after update',
		async (server, { localDeck }) => {
			const serverDeck = await server.getDeck(lang)
			should('lang matches', localDeck.lang === serverDeck.lang)
			should(
				'goal matches',
				localDeck.daily_review_goal === serverDeck.daily_review_goal
			)
		},
		() => ({ localDeck })
	)
}, [lang])
```

## Test User Roles

| Role       | Description                                   |
| ---------- | --------------------------------------------- |
| `visitor`  | Not logged in                                 |
| `new-user` | Fresh account, hasn't completed onboarding    |
| `learner`  | Logged in user with decks (default test user) |

## Coverage Comparison

The scenes cover the same user journeys as the Playwright tests:

| Playwright File                  | Scenes Covered               |
| -------------------------------- | ---------------------------- |
| `login-flow.spec.ts`             | Authentication scenes        |
| `navigations/logged-in.spec.ts`  | Navigation scenes            |
| `navigations/logged-out.spec.ts` | Logged out navigation scenes |
| `mutations/decks.spec.ts`        | Deck management scenes       |
| `mutations/cards.spec.ts`        | Card management scenes       |
| `mutations/requests.spec.ts`     | Request scenes               |
| `mutations/playlists.spec.ts`    | Playlist scenes              |
| `mutations/feed.spec.ts`         | Feed scenes                  |
| `friends/chats.spec.ts`          | Chat scenes                  |
| `mutations/reviews.spec.ts`      | Review scenes                |
| `mutations/onboarding.spec.ts`   | Onboarding scenes            |

## Next Steps

1. **Add test IDs** - Use `TEST_IDS.md` as a checklist to add `data-testid` attributes
2. **Implement API extensions** - If Scenetest doesn't have `seeId`, `clickId`, etc., implement them
3. **Add inline assertions** - Use `useTestEffect` in components to verify state consistency
4. **Set up fixtures** - Create a fixture system for test data setup
5. **Run scenes** - Configure Scenetest to run against local dev server
