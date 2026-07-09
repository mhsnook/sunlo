# Testing with Scenetest

**Always write new tests as scenetest specs** unless a specific limitation prevents it. Scenetest specs are readable markdown files that describe user journeys at a high level — they're easier to write, easier to review, and keep browser orchestration separate from state assertions.

```bash
# Run all scenetest specs
pnpm scene

# Run a specific scene file
pnpm scene scenetest/scenes/decks.spec.md
```

Scene specs located in `/scenetest/scenes/` directory (`.spec.md` files). Requires the dev server (`pnpm dev`) and Supabase to be running locally. Config is in `scenetest/config.ts`.

**Strong default: Markdown scenes + inline runtime checks.** Three authoring surfaces exist under `scenetest/scenes/` (see [reference](https://scenetest.msnook.xyz/reference/concurrent-and-classic.md)), but reach for them in this order:

1. **Markdown scenes** (`.spec.md`) — the default for nearly every spec.
2. **TypeScript scenes** — `scene()` from `@scenetest/scenes`. Same scene runtime, in TS, for custom setup/teardown or logic Markdown can't express.
3. **Playwright specs** — `test()` from `@scenetest/scenes` (NOT raw `@playwright/test`). Sequential await-driven model with scenetest's actor handles and selectors. Only for multi-actor flows with timing-sensitive logic the scene runtime can't express.

**Runtime checks** — scenetest's inline assertion functions `should()`, `failed()`, `serverCheck()` — live inside application code (components, mutation callbacks, effects) and report to the observer panel in dev. The Vite plugin strips them from production builds. They're a peer to scene specs, not a fallback. **Lean on them especially for mutation flows**: the scene asserts the user-visible outcome (`see toast-success`), while the inline check inside the mutation handler enforces the collection-state / client-server agreement that the old e2e tests were scraping from the DOM.

**Do not write new `@playwright/test` specs.** The legacy `e2e/` directory is deprecated and slated for removal — see the `transform` label. Its `pnpm test` / `pnpm test:*` scripts have already been removed; the remaining specs run via `pnpm exec playwright test` directly. Don't add new specs here. Migrate existing ones to `scenetest/scenes/`.

## Writing Scene Specs

Scene specs are markdown files in `scenetest/scenes/`. Each file contains one or more named scenes:

```markdown
# scene title (human-readable description)

cleanup: supabase.from('table').delete().eq('uid', '[learner.key]').eq('lang', 'spa')

learner:

- login
- openTo /learn
- see decks-list-grid
- click deck-link
- up
- seeToast toast-success
```

**DSL commands:**

| Command    | Args           | Purpose                                                   |
| ---------- | -------------- | --------------------------------------------------------- |
| `openTo`   | path           | Navigate to URL                                           |
| `see`      | selector       | Assert element is visible                                 |
| `notSee`   | selector       | Assert element is NOT visible                             |
| `seeText`  | text           | Assert text is visible                                    |
| `seeToast` | selector       | Wait for toast to appear then disappear                   |
| `click`    | selector       | Click element                                             |
| `typeInto` | selector value | Type text into input                                      |
| `up`       | (none)         | Wait for page to settle (async ops, animations)           |
| `login`    | (none)         | Macro: navigates to /login, fills email/password, submits |

**Selectors** resolve to `data-testid` attributes. For items inside lists, use space-separated selectors: `decks-list-grid hin deck-link` finds `[data-testid="deck-link"]` inside `[data-key="hin"]` inside `[data-testid="decks-list-grid"]`. See `scenetest/TEST_IDS.md` for the full registry.

**Template variables:**

- `[self.email]`, `[self.password]` — current actor's credentials
- `[actor.key]` — actor's UUID (e.g., `[learner.key]`, `[friend.key]`)
- `[team.lang]` — team's language code (e.g., `'kan'`)

**Actors** (defined in `scenetest/actors/default.ts`):

- `visitor` — not logged in
- `new-user` — fresh account, needs onboarding
- `learner` — main test user with decks and data
- `friend` — secondary user for multi-actor flows
- `learner2`, `learner3` — additional test users

**Cleanup directives** run both before AND after the scene for idempotency. They execute Supabase JS expressions with the server client from `scenetest/config.ts`.

**Setup directives** run before the scene to pre-set state (e.g., `setup: supabase.from('user_deck').update(...)`). Use them when a scene requires non-default initial state.

**Custom macros** are defined in `scenetest/config.ts` via `defineMacro('name', [...steps])`. Use them as bare step names in specs.

**Adding test IDs to components**: Use `data-testid` for unique elements, `data-key` for list items (on the item element, with `data-testid` on the container), and `data-name`+`data-key` for items without a wrapper. Register new IDs in `scenetest/TEST_IDS.md`.

## Scene Navigation

Navigate through the UI by clicking links and buttons, not by reloading the page. A full reload (e.g. `openTo` mid-scene) wipes the TanStack Router cache and forces a refetch of all data, which both slows the scene and hides cache-invalidation regressions. `openTo` is for the entry point only; after that, drive the actor through clicks.

```markdown
# ✅ Correct — preserves router cache

learner:

- openTo /learn
- click app-nav-menu nav-link--feed

# ❌ Wrong — full reload, refetches everything

learner:

- openTo /learn
- openTo /learn/hin/feed
```

For legacy `@playwright/test` specs in `e2e/`, the equivalent rule was "never use `page.goto()`" — same principle.

## Use UI Semantics for Test Selectors

When writing tests, instead of using names or exact display text for the user, use testids like "affirm-community-norms-button", and add them into the markup as a cue that will help devs understand the purpose and expectations for the page they're working with.

```
		// Dialog should close and we should see the welcome content
		await expect(welcomeHeader).toBeVisible({ timeout: 5000 })

		// ✅🙌 using UI semantics
		await expect(page.getByTestId('sunlo-welcome-explainer')).toBeVisible()

		// ❌🙅 using exact page text
		await expect(page.getByText('What is Sunlo?')).toBeVisible()

```
