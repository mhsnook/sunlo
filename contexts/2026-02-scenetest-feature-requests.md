# Scenetest Feature Requests

## 1. Actor browser state via Playwright's `storageState`

### Problem

Every scene starts with a fresh browser context. This means:

- Every actor must log in via the UI on every scene (slow, repetitive)
- Intro dialogs (stored as "seen" in localStorage) always appear and block interactions
- There's no way to distinguish a "fresh user" testing onboarding from a "warm user" testing normal flows

### Proposed solution

Pass through Playwright's existing [`storageState`](https://playwright.dev/docs/api/class-browser#browser-new-context-option-storage-state) option on actor or team config. This is a first-class Playwright feature that saves/restores cookies and localStorage for a browser context.

Two parts:

#### A. Inline localStorage on actors

Allow actors to declare localStorage entries that get loaded before the scene starts:

```ts
export default defineTeam({
	tags: { lang: 'kan' },
	actors: {
		learner: {
			email: 'sunloapp@gmail.com',
			password: 'password',
			key: 'cf1f69ce-...',
			localStorage: {
				'sunlo-intro-review': 'seen',
				'sunlo-intro-feed': 'seen',
			},
		},
		// no localStorage = clean browser, tests onboarding
		'new-user': {
			email: 'sunloapp+new@gmail.com',
			password: 'password',
			key: 'd4e5f6a7-...',
		},
	},
})
```

Implementation: before each scene, call [`context.addInitScript()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script) or use [`storageState`](https://playwright.dev/docs/api/class-browser#browser-new-context-option-storage-state) to inject the entries.

#### B. Auth session warmup (the bigger win)

Allow actors to specify that they should be "pre-authenticated." The framework would:

1. At the start of the test run, log in each actor once via the `login` macro
2. Capture the resulting `storageState` with [`context.storageState()`](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
3. Reuse that state for every scene the actor participates in

This is a standard Playwright pattern, typically done in [`globalSetup`](https://playwright.dev/docs/auth#basic-shared-account-in-all-tests). The scenetest version could look like:

```ts
export default defineTeam({
	actors: {
		learner: {
			email: 'sunloapp@gmail.com',
			password: 'password',
			key: 'cf1f69ce-...',
			warmup: true, // logs in once, reuses session for all scenes
			localStorage: {
				'sunlo-intro-review': 'seen',
			},
		},
	},
})
```

With `warmup: true`, the framework runs the `login` macro once, merges in any `localStorage` entries, and saves the combined state. Each scene for that actor starts with a fully authenticated browser that has intros dismissed, collections loaded, etc.

Actors without `warmup` (like `new-user` or `visitor`) get a clean browser and test the cold-start flows.

### Impact

This would let us:

- Drop the `login` macro from ~90% of scenes (saves ~1-2s per scene)
- Test review flows without intro dialogs blocking (currently 3 scenes disabled)
- Have dedicated "fresh user" actors for onboarding tests
- Dramatically reduce total test runtime

### Playwright docs

- [Browser context `storageState` option](https://playwright.dev/docs/api/class-browser#browser-new-context-option-storage-state)
- [Saving/restoring `storageState`](https://playwright.dev/docs/api/class-browsercontext#browser-context-storage-state)
- [Authentication guide](https://playwright.dev/docs/auth)
- [`addInitScript` for localStorage](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script)

---

## 2. Multi-token selector: filter-then-pick instead of pick-then-filter

### Problem

When a directive uses two tokens like `click sidebar-link /learn/$lang/review`, the current behavior is:

```
find ALL elements matching "sidebar-link"
  .first()                              // pick ONE element
  .locator("self or descendant matching /learn/$lang/review")
  .first()
```

This breaks when the first `sidebar-link` in DOM order isn't the one containing `/learn/$lang/review`. The test times out because it's searching inside the wrong element.

Same problem with portalled elements: `click sidebar-user-menu-trigger` opens a dropdown, then `click /profile` finds a sidebar link behind the dropdown overlay instead of the dropdown menu item.

### Proposed solution

Move `.first()` to the end of the chain. Filter all matches first, then pick:

```
find ALL elements matching "sidebar-link"
  .filter({ has: "self or descendant matching /learn/$lang/review" })
  .first()                              // pick from the filtered set
```

In Playwright terms, replace:

```js
// Current (broken)
page.locator(token1Selector).first().locator(token2SelfOrDescendant).first()
```

With:

```js
// Proposed (correct)
page
	.locator(token1Selector)
	.filter({ has: page.locator(token2Selector) }) // descendants
	.or(page.locator(token1Selector + token2Selector)) // same element
	.first()
```

For 3+ tokens, chain `.filter()` calls:

```js
page
	.locator(token1Selector)
	.filter({ has: page.locator(token2Selector) })
	.filter({ has: page.locator(token3Selector) })
	.first()
```

The mental model: each token narrows the candidate set. Only after all narrowing is done do we pick the first match.

### Impact

This would fix:

- Sidebar link navigation (`click sidebar-link /learn/$lang/review`) -- currently worked around by using single-token selectors with just the data-key value
- User menu item selection when sidebar has same data-key values (currently 1 scene disabled)
- Any future multi-token selector where DOM order doesn't match the desired target

### Playwright docs

- [`locator.filter()`](https://playwright.dev/docs/api/class-locator#locator-filter)
- [`locator.or()`](https://playwright.dev/docs/api/class-locator#locator-or)
