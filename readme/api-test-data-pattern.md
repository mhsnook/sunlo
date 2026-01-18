# API-Based Test Data Management Pattern

## Overview

Instead of creating test data through the UI, we now create it directly via API calls. This gives us:

- ✅ **Faster tests** - No UI navigation for setup
- ✅ **Precise cleanup** - We know exactly what to delete
- ✅ **Direct access to IDs** - No parsing from UI
- ✅ **More reliable** - Less dependent on UI state

## The Pattern

```typescript
test('my test', async ({ page }) => {
	await loginAsTestUser(page)

	// 1. Create test data to act upon, via API
	const { phrase } = await createPhrase({
		lang: 'hin',
		text: 'test phrase',
		translationText: 'test translation',
	})
	const pid = phrase.id

	try {
		// 2. Navigate directly to the resource
		await page.goto(`/learn/hin/${phraseId}`)

		// 3. Test UI interactions
		await page.click('button:has-text("Add to deck")')

		// 4. Wait for the success toast (the full client-server-client round-trip)
		await expect(page.getByText('Success')).toBeVisible()

		// 5. Verify mutation worked by checking directly in the database
		const { data: card } = await getCardByPhraseId(pid, TEST_USER_UID)
		expect(card?.status).toBe('active')

		// 5. Verify that the local collection has been updated too
		const cardInCollection = await page.evaluate(
			(pid) => (window as any).__cardsCollection.get(pid),
			pid
		)
		expect(cardInCollection?.status).toBe('active')

		// 6. Test that the data matches both places
		expect(card).toMatchObject({
			id: cardInCollection.id,
			created_at: cardInCollection.created_at,
			phrase_id: cardInCollection.phrase_id,
			uid: cardInCollection.uid,
			lang: cardInCollection.lang,
			status: cardInCollection.status,
			updated_at: cardInCollection.updated_at,
		})
	} finally {
		// 7. Clean up precisely what we created
		await deletePhrase(pid) // Cascades to translations and cards
	}
})
```

## Available Helper Functions

### `createPhrase(params)`

Creates a phrase with one translation.

```typescript
const { phrase, translation } = await createPhrase({
	lang: 'hin', // Required
	text: 'test phrase', // Required
	translationText: 'translation', // Required
	translationLang: 'eng', // Optional, defaults to 'eng'
})

// Returns both the phrase and translation objects
const phraseId = phrase.id
const translationId = translation.id
```

### `deletePhrase(phraseId)`

Deletes a phrase and all related data (cascades automatically).

```typescript
await deletePhrase(phraseId)
// This deletes:
// - The phrase
// - All translations
// - All cards
// - All reviews
// (Due to database foreign key CASCADE)
```

### `deleteCard(cardId)`

Deletes a specific card (and its reviews).

```typescript
await deleteCard(cardId)
// This deletes:
// - The card
// - All reviews for that card
```

## When to Use This Pattern

### ✅ Use API creation for:

- **Setup data** - Creating phrases/cards to test
- **Fixtures** - Data that the test will interact with
- **Speed-critical tests** - Avoiding slow UI navigation

### ❌ Use UI creation for:

- **Testing the create flow itself** - When you're testing the form
- **End-to-end user journeys** - When testing the full experience
- **Complex multi-step creation** - When creation has many UI steps you need to verify

## Examples

### Example 1: Testing Card Status Changes

```typescript
test('change card status', async ({ page }) => {
	await loginAsTestUser(page)

	// Create phrase via API (fast)
	const { phrase } = await createPhrase({
		lang: 'hin',
		text: 'test phrase',
		translationText: 'test',
	})

	try {
		// Go straight to the phrase page
		await page.goto(`/learn/hin/${phrase.id}`)

		// Test the UI for adding/changing card status
		await page.click('button:has-text("Not in deck")')
		await page.click('text=Add to deck')

		// Verify it worked
		await expect(async () => {
			const { data: card } = await getCardByPhraseId(phrase.id, TEST_USER_UID)
			expect(card?.status).toBe('active')
		}).toPass()
	} finally {
		await deletePhrase(phrase.id)
	}
})
```

### Example 2: Testing Review Flow

```typescript
test('submit review', async ({ page }) => {
	await loginAsTestUser(page)

	// Create a phrase with a card
	const { phrase } = await createPhrase({
		lang: 'hin',
		text: 'review test',
		translationText: 'test',
	})

	try {
		// Add it to deck via API (even faster!)
		await supabase.from('user_card').insert({
			phrase_id: phrase.id,
			uid: TEST_USER_UID,
			lang: 'hin',
			status: 'active',
		})

		// Now test the review flow
		await page.goto('/learn/hin/review')

		// ... test the review UI ...
	} finally {
		await deletePhrase(phrase.id)
	}
})
```

### Example 3: Testing with Multiple Phrases

```typescript
test('test with multiple phrases', async ({ page }) => {
	await loginAsTestUser(page)

	// Create multiple phrases at once
	const phrase1 = await createPhrase({
		lang: 'hin',
		text: 'phrase 1',
		translationText: 'translation 1',
	})

	const phrase2 = await createPhrase({
		lang: 'hin',
		text: 'phrase 2',
		translationText: 'translation 2',
	})

	try {
		// Test something with both phrases
		// @@TODO this will be the "my-stuff" page when we rename/relink it
		await page.goto('/learn/hin/contributions')
		await expect(page.getByText('phrase 1')).toBeVisible()
		await expect(page.getByText('phrase 2')).toBeVisible()
	} finally {
		// Clean up both
		await deletePhrase(phrase1.phrase.id)
		await deletePhrase(phrase2.phrase.id)
	}
})
```

## Benefits Over UI Creation

### Before (UI-based):

```typescript
test('test card status', async ({ page }) => {
	await loginAsTestUser(page)

	// ✅ Navigate to destination with clicks and testIds
	await page.getByTestId('link--deck-hin').click()
	await page.getByTestId('link--new-phrase').click()

	// ❌ Don't use goto bc it breaks the SPA UX
	// await page.goto('/learn/hin/phrases/new')

	// Fill out the entire form
	await page.fill('textarea[name="phrase"]', 'test')
	await page.fill('textarea[name="translation"]', 'test')
	await page.click('button[role="combobox"]')
	await page.click('text=English')
	await page.click('button[type="submit"]')

	// Parse ID from success message
	const link = page.locator('a[href*="/learn/hin/"]')
	const href = await link.getAttribute('href')
	const id = href?.split('/').pop()

	// Finally start the actual test...
})
```

### After (API-based):

```typescript
test('test card status', async ({ page }) => {
	await loginAsTestUser(page)

	// Create test data instantly
	const { phrase } = await createPhrase({
		lang: 'hin',
		text: 'test',
		translationText: 'test',
	})

	try {
		// Start testing immediately
		await page.goto(`/learn/hin/${phrase.id}`)
		// ... actual test ...
	} finally {
		await deletePhrase(phrase.id)
	}
})
```

**Results:**

- ⏱️ **5-10 seconds faster** per test
- 🎯 **More focused** - testing what matters
- 🛡️ **More reliable** - less UI dependency
- 🧹 **Cleaner** - precise cleanup

## Adding More Helpers

As you write more tests, add helpers for other resources:

```typescript
// In db-helpers.ts

export async function createCard(params: {
	phraseId: string
	uid: string
	lang: string
	status?: 'active' | 'learned' | 'skipped'
}) {
	const { data, error } = await supabase
		.from('user_card')
		.insert({
			phrase_id: params.phraseId,
			uid: params.uid,
			lang: params.lang,
			status: params.status ?? 'active',
		})
		.select()
		.single()

	if (error) throw error
	return data
}

export async function createReview(params: { cardId: string; rating: number }) {
	// ... create review directly
}
```

This pattern will make your whole E2E test suite faster and more maintainable! 🚀
