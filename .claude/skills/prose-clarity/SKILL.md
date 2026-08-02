---
name: Prose Clarity (STE-inspired)
description: 'Rewrite pass over existing human-facing prose — PR descriptions, commit messages, code comments, UI copy, button labels, docs, chat. Applies ASD-STE100 discipline: one word per meaning, active voice, simple tense, short sentences. Triggers: tighten this copy, simplify this prose, STE rewrite, clean up this PR description, review my microcopy.'
version: 0.2.0
---

# Prose Clarity

ASD-STE100 (Simplified Technical English) is a controlled-language standard built by the aerospace and defense industry to stop maintenance technicians from misreading English. It removes the two biggest sources of misreading: words with more than one meaning, and sentences with more than one possible structure. It exists because a misread instruction on an aircraft can kill someone.

This skill borrows that discipline for **any prose a human will read**. The reader is usually skimming and often not a native English speaker. The text may be a PR description, a GitHub issue, a commit message, a code comment, a button label, an empty state, an error message, a doc page, or a paragraph of chat. Where it gets read does not change the job.

This skill is a **rewrite pass over text that already exists**. For writing prose this way in the first place, the `Clear Technical` output style covers it.

## When to use this skill

- You have a draft — PR body, commit message, release note, doc section, screen of UI copy — and want it tightened before it ships.
- Copy has drifted: the same action is called three different things across buttons, toasts, and docs.
- A code comment narrates the current change instead of stating a durable fact.
- Someone asks to "simplify", "tighten", "clean up", or "de-jargon" a block of text.
- You want a **before/after** table showing exactly which rule each sentence broke.

## Scope and source

This encodes the **rule categories** of ASD-STE100 Issue 9 (Jan 2025): 53 writing rules across 9 sections, backed by a dictionary of ~900 approved words (one meaning, one part of speech each) and ~1,200 words to avoid. See `references/writing-rules.md` for the fuller summary and citations.

It does **not** reproduce ASD's approved dictionary verbatim — that is ASD's own free-to-download standard. It applies the underlying principle instead: pick the plainest, most common word available and use it the same way every time. If you need certified STE for actual aircraft documentation, download the standard at https://www.asd-ste100.org/ and check word by word.

## Core rewrite rules

| Rule                         | Do                                                                                            | Don't                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| One word, one meaning        | Pick one verb per action and reuse it everywhere — button, toast, error, docs, commit message | Rotate "delete" / "remove" / "discard" / "clear" for the same act           |
| One part of speech per word  | "Apply oil to the valve" (oil = noun)                                                         | "Oil the valve" (oil = verb), if the word is approved only as a noun        |
| Active voice, explicit actor | "The loader preloads the collection."                                                         | "The collection is preloaded." — unless the actor is unknown or irrelevant  |
| Simple tenses                | "The test failed."                                                                            | "The test has been failing."                                                |
| One claim per sentence       | "Open the file. Read line 3."                                                                 | "Open the file and read line 3, then check whether it matches."             |
| Sentence length              | ≤20 words for instructions, ≤25 for descriptions, shorter still for anything read mid-task    | Long compound sentences with nested subordinate clauses                     |
| Condition before consequence | "If the deck is empty, the review button stays disabled."                                     | Burying the condition in a trailing clause                                  |
| Noun clusters                | ≤3 words stacked ("fuel pump valve")                                                          | "high pressure fuel pump inlet valve assembly"                              |
| No rule of threes            | Give the number of items that exist; two examples are fine if two make the point              | Padding a list to three, or stacking three parallel clauses, for rhythm     |
| No ellipsis                  | Keep subject, verb, and article explicit even when it reads longer                            | Dropping words to save space, creating ambiguity about which thing is meant |
| Lists for sequences          | A numbered or bulleted list for 3+ steps or conditions                                        | A sequence buried inside one prose sentence                                 |
| Domain terms                 | Keep necessary technical terms for readers who have them; define once if not common           | Jargon aimed at a reader who was never taught it                            |
| No dead words                | "Deck saved"                                                                                  | "Your deck has been successfully saved!" — cut "please", "simply", "just"   |

## Match the channel

Do not apply one target to every string. Check what the reader needs before rewriting.

| Channel                    | Reader                              | Keep                                                                        |
| -------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| Chat                       | The user, now, holding full context | Reasoning, uncertainty, options, a direct recommendation                    |
| Commit message             | Someone reading history later       | Why this change happened                                                    |
| PR description             | A reviewer, this week               | What changed and why, ordered for review                                    |
| GitHub issue               | Someone triaging it cold, later     | The problem and how to reproduce it — enough to act on without the thread   |
| Code comment               | A cold maintainer, months from now  | Only durable facts needed to change _this_ code correctly                   |
| UI copy, labels, microcopy | A user mid-task, not reading you    | What this does or what just happened, in their words, in as few as possible |
| Error message              | A user who is now stuck             | What failed, and the one next action that unblocks them                     |
| Docs                       | Someone with a question             | The answer first, caveats after                                             |

Two consequences worth stating outright:

- **PR-relevant rationale does not belong in a code comment.** It becomes dead weight the day the PR merges, and it burdens a reader who was not thinking about that concept.
- **Developer vocabulary does not belong in UI copy.** A user does not have a "collection", a "row", or a "sync". Name the thing they think they are looking at.

### UI copy specifics

- A button label names what happens when you press it: "Save changes", "Delete deck" — not "OK", "Submit", "Confirm".
- Say what happened, not that something happened: "Deck saved" beats "Success".
- Front-load. The first two words carry the meaning; users stop reading after them.

## Process

1. Read the whole input once for meaning. Do not start rewriting before you know what it must still say afterward.
2. Identify the channel and reader from the table above. That sets the length target and the vocabulary.
3. Walk it sentence by sentence and flag every rule violation: word inconsistency, tense, voice, length, ellipsis, noun stacking, buried condition, dead words.
4. If the text names an action, grep the surrounding codebase or copy for other names for the same action. Inconsistency across files is the most common and most invisible violation.
5. Rewrite each flagged sentence to fix the violation while preserving the meaning exactly. If a rewrite would drop necessary precision — a condition, a scope qualifier, a number — keep the longer phrasing and flag it instead of silently cutting it.
6. Produce a before/after table.
7. If the input already complies, say so. Do not force changes onto compliant text.

## Output format

```markdown
| Rule violated           | Original                                | Rewritten                                   |
| ----------------------- | --------------------------------------- | ------------------------------------------- |
| Present perfect tense   | "We have received your request."        | "We received your request."                 |
| Noun cluster (4+ words) | "the agent task queue priority handler" | "the handler that sets task-queue priority" |
```

Follow the table with a one-line note on anything you deliberately did **not** simplify, and why — usually because simplifying would lose required precision.

## Boundaries

**Will:**

- Rewrite dense or ambiguous prose into short, single-meaning, active-voice sentences.
- Name the rule each sentence broke, before rewriting it.
- Preserve every fact, condition, and scope qualifier in the original.
- Flag inconsistent naming for the same action across files.

**Will not:**

- Reproduce ASD's official ~900-word dictionary as if memorized. Treat the official download as the source of truth for exact approved wording.
- Strip honest hedging. "This may have caused the failure" does not become "this caused the failure." Clarity removes ambiguity; it never manufactures confidence.
- Drop a safety condition, exception, or number to shorten a sentence. It flags the trade-off instead.
- Add enthusiasm, marketing adjectives, or praise while rewriting. If the original has them, they come out.
- Claim to produce certified STE-compliant aerospace documentation. This is a general-purpose clarity tool inspired by STE.

## Additional resources

- **`references/writing-rules.md`** — fuller summary of the 9 rule sections and dictionary structure, with citations.
- **`examples/before-after.md`** — worked examples: official STE rule illustrations, then applied examples across PR bodies, code comments, UI copy, and status updates.

## Credit

Adapted from [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill) (MIT, © 2026 Dustin Yuchen Teng). See `LICENSE`.
