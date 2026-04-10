# How FSRS works in Sunlo

## The split: client does the math, server stores the results

FSRS scheduling runs entirely on the client. When you score a card (Again / Hard / Good / Easy), the client calculates the new difficulty, stability, and retrievability using `src/features/review/fsrs.ts`, then writes those values directly to `user_card_review` via a Supabase insert. The server doesn't run any FSRS logic — it stores the numbers and trusts the client. There are CHECK constraints on the table columns to reject clearly invalid values (e.g. difficulty outside 1–10), but no server-side recalculation.

The server does have the retrievability formula baked into the `user_card_plus` view — it computes `retrievability_now` from `current_timestamp` and the latest review's stability. This is used for queries and sync. The same formula exists in TypeScript (`retrievability()` in `fsrs.ts`). Both need to agree.

Card selection ("is this card due?") also happens on the client. The review setup page filters the user's cards from a local TanStack DB collection, computing retrievability in real-time and selecting cards where it drops to 0.9 or below.

## Two review directions

Each phrase can produce two cards:

- **Forward** — you see the phrase in the target language, recall the meaning
- **Reverse** — you see translations, recall the phrase in the target language

These are separate rows in `user_card`, keyed by `(uid, phrase_id, direction)`. They have independent difficulty, stability, and review history. FSRS treats them as unrelated cards — one can be due while the other isn't.

The manifest (the ordered list of cards for a day's session) encodes both pieces as composite strings: `"<phrase_id>:forward"` or `"<phrase_id>:reverse"`. Bare UUIDs without a direction suffix are treated as forward for backward compatibility with sessions created before bidirectional cards existed.

### Session ordering

When building the day's manifest, cards are sorted into four buckets in this order:

1. Forward cards that are due (reviewed before, retrievability <= 0.9)
2. Forward cards that are new (never reviewed)
3. Reverse cards that are due
4. Reverse cards that are new

So you work through all your forward material first, then all your reverse material. This is a soft separation — not a hard rule. Both directions appear in the same session.

### The card UI

Forward cards show the target-language phrase as the question, translations as the answer. Reverse cards flip it: translations as the question, phrase as the answer. A small badge in the corner shows which direction you're on.

## `only_reverse` phrases

Some phrases are flagged `only_reverse` in the database. The idea: for things like numbers, recognizing "tres" as "three" is trivial — the challenge is recalling "tres" when prompted with "three." For these phrases, only a reverse card gets created. No forward card.

This is handled by `directionsForPhrase()` in `src/features/deck/card-directions.ts` — it returns `['reverse']` when `only_reverse` is true, `['forward', 'reverse']` otherwise. All client-side card creation paths (review setup, card status dropdown, playlist bulk-add, bulk-add page) use this function. The SQL RPC `add_phrase_translation_card` has the same logic baked in.

Right now `only_reverse` is set at phrase creation time and there's no UI to toggle it after the fact. It's also not surfaced prominently anywhere — a contributor has to know it exists when creating a phrase.

## What the server owns vs. what the client owns

**Server owns:**

- The `user_card` rows (which cards exist, their status)
- The `user_card_review` rows (review history with FSRS values)
- The `user_deck_review_state` rows (daily manifest, stage)
- The `user_card_plus` view (pre-computed retrievability for queries)
- RLS (who can see what)

**Client owns:**

- FSRS calculation (difficulty, stability after each review)
- Card selection (which cards are due today)
- Manifest ordering (the sequence you review in)
- Session flow (stages 1–5, handling "Again" cards)

The client also maintains local copies of all the above in TanStack DB collections, which stay in sync via Supabase realtime subscriptions and optimistic updates in mutation `onSuccess` handlers.

## Review stages

A review session moves through stages:

1. **First pass** — work through every card in the manifest. Score each one. `day_first_review = true` for these.
2. **Unreviewed cards** — go back for any you skipped.
3. **Re-review prompt** — if you scored any card "Again" (score 1), you're asked if you want to re-review them.
4. **Re-reviews** — re-do the "Again" cards. These get `day_first_review = false` and don't update FSRS state (the first-pass score is what counts for scheduling).
5. **Done.**

Stage is tracked both in the Zustand store (for immediate UI response) and persisted to `user_deck_review_state.stage` on the server (so you can resume if you close the tab).

## Things that are a bit rough

- The client calculates FSRS and the server trusts it. There's no server-side validation beyond CHECK constraints. A tampered client could write arbitrary difficulty/stability values.
- `retrievability_now` in the SQL view and `retrievability()` in TypeScript are the same formula, but there's no automated check that they stay in sync if one changes.
- `only_reverse` has no UI for editing after phrase creation. You'd have to go into the database.
- The manifest is an ordered array of strings stored as JSON in Postgres. It's built once at session start and never updated — if new cards become due mid-session, they won't appear until tomorrow.
- Card creation on the client side doesn't go through the RPC — it does direct inserts. The RPC and the client code both need to stay in agreement about direction logic. `directionsForPhrase()` is the client's source of truth; the RPC has its own `IF NOT phrase_only_reverse THEN` block.
