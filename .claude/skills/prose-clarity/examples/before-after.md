# Before / After Examples

## Part 1 — Official STE Examples

These illustrate real ASD-STE100 rules, drawn from public secondary sources (see `references/writing-rules.md`). They are paraphrased illustrations of the rule, not quotes from the standard itself.

| Rule                        | Before                                                               | After                                                                    | Why                                                                                                |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| One meaning per word        | "Verify the system." / "Check the connections." / "Confirm receipt." | "Make sure the system is correct." (one approved term used consistently) | Three near-synonyms force the reader to guess whether they mean the same action.                   |
| One part of speech per word | "Oil the valve."                                                     | "Apply oil to the valve."                                                | If "oil" is approved only as a noun, using it as a verb breaks the one-word-one-role guarantee.    |
| Precise verb meaning        | "Follow the safety instructions."                                    | "Obey the safety instructions."                                          | "Follow" can mean "come after" or "obey" — STE picks the unambiguous one.                          |
| Simple tense only           | "We have received the technical reports from HQ."                    | "We received the technical reports from HQ."                             | Present perfect adds a second parse ("received, and still relevant now?") that simple past avoids. |

## Part 2 — Applied to Human-Facing Prose

These are original examples built for this skill's actual use case: rewriting prose a person will read. They are illustrations, not quotes from any real product.

### Example A — PR description

**Before:**

> This PR attempts to address the issue where the deck preloading behaviour that had been previously implemented was causing intermittent failures under certain conditions, and also includes some refactoring of the collection setup code that was needed in order to make the fix possible.

**Violations flagged:**

- 44 words, one sentence, carrying both the bug and the refactor.
- Past perfect and passive stacking: "had been previously implemented", "was needed".
- "Certain conditions" names nothing. The reviewer cannot tell when the bug fires.

**After:**

> Deck preloading failed intermittently when a route rendered before the collection finished syncing. This PR awaits the preload instead of firing it and forgetting it.
>
> It also reorders setup in `collections.ts`, which the fix required. That part is mechanical — review it second.

### Example B — Code comment

**Before:**

> ```ts
> // We need to await this here because otherwise the preload fires
> // fire-and-forget and we were seeing intermittent failures in the
> // route loader, which is what this PR fixes. Don't worry about the
> // sync flag below, that's already handled.
> ```

**Violations flagged:**

- Narrates the current change ("which is what this PR fixes"). That is dead weight once merged.
- Reassures about the sync flag, raising a concept the reader was not thinking about only to dismiss it.
- "We were seeing" describes a moment that does not survive the commit.

**After:**

> ```ts
> // Must await: the route renders before the collection syncs otherwise.
> ```

The rewrite keeps the one durable fact a cold maintainer needs in order to avoid reintroducing the bug. The rest belongs in the commit message or the PR body.

### Example C — UI copy and button label

**Before:**

> Heading: "Oops! Something went wrong 😕"
> Body: "We were unable to successfully sync your collection at this time. Please simply try again later!"
> Button: "OK"

**Violations flagged:**

- "Something went wrong" names nothing. The user learns only that they are stuck.
- Developer vocabulary leaking into UI: a user has decks, not a "collection".
- Dead words: "successfully", "simply", "at this time". An exclamation mark on a failure.
- The button label does not say what pressing it does.

**After:**

> Heading: "Your decks didn't save"
> Body: "You're offline. Your changes are stored on this device and will save when you reconnect."
> Button: "Keep editing"

### Example D — Status update in chat

**Before:**

> Great question! I've gone ahead and made some updates to the review scheduler, and it looks like things should be working now — the tests have been passing and I believe the underlying issue with the FSRS interval calculation has been resolved.

**Violations flagged:**

- Opens with flattery, which carries no information.
- "It looks like", "should be", and "I believe" hedge a fact that was actually verified. False modesty is as unclear as false confidence.
- Present perfect throughout, and no statement of what was actually run or what was left unrun.

**After:**

> Fixed the FSRS interval calculation in the review scheduler: it rounded down before applying the ease factor instead of after.
>
> `pnpm test:unit` passes, 143 tests. I did not run the scene tests — they need Supabase up.

## How to Read These Examples

Part 1 shows the rules this skill is built on. Part 2 shows the transfer: the same discipline that keeps an aircraft technician from misreading a manual keeps a reviewer, a maintainer, and a stuck user from misreading you.

Note what stays constant across Part 2 and what does not. The mechanics are identical in every channel. What changes is the **vocabulary and the length target**: a PR body may name `collections.ts`, a UI string may not; a chat update can run several sentences, a button label gets two words.
