# Feature Request: `setup:` directive for scenetest

## Summary

We need a `setup:` directive that runs arbitrary Supabase queries **before** a scene starts, analogous to how `cleanup:` already works. Without it, many scenes cannot pre-set the database state they need to test specific UI flows.

## Current behavior

Using `setup:` in a scene spec causes:

```
Timeout: no available team has roles [setup, cleanup, learner]
```

Scenetest v0.2.0 treats `setup` as an unknown actor role and times out waiting for a team that provides it.

## Why `cleanup:` alone isn't enough

`cleanup:` runs both before AND after a scene, which resets state to a known baseline. But some scenes need the baseline to be **different from the default seed data**. For example:

- **Testing "switch from 2-buttons back to 4-buttons"**: The learner's profile default is `4-buttons`. To test switching back, the deck must already have `review_answer_mode: '2-buttons'` set — but cleanup resets it to `null` before the scene runs, so there's nothing to switch back from.
- **Testing unread notification badge**: Requires inserting notification rows for the learner before the scene starts. Cleanup deletes them.
- **Testing "clear deck override"**: The clear button is disabled when there's no override. Setup is needed to create the override that the scene then clears.

## Desired syntax

Same as `cleanup:` — a Supabase JS expression on one line:

```markdown
setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', 'kan')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', 'kan')
```

### Template variable interpolation

Should support the same variables as `cleanup:`:

- `[actor.key]` — UUID of a named actor (e.g., `[learner.key]`, `[friend.key]`)
- `[team.lang]` — the team's language tag (currently not supported in `cleanup:` either — see below)
- `[today]` — current date string
- `[testStart]` — timestamp when the test run began (also not yet supported in `cleanup:`)

### Note on template variables

In our testing we found that `[team.lang]` and `[testStart]` are not recognized in `cleanup:` directives either. `[actor.key]` (e.g., `[learner.key]`) does work. Supporting all of these in both `setup:` and `cleanup:` would unblock many more scenes.

## Concrete examples from our specs

### 1. Pre-set review answer mode (review-answer-mode.spec.skip.md)

```markdown
setup: supabase.from('user_deck').update({ review_answer_mode: '2-buttons' }).eq('uid', '[learner.key]').eq('lang', 'kan')
cleanup: supabase.from('user_deck').update({ review_answer_mode: null }).eq('uid', '[learner.key]').eq('lang', 'kan')

learner:

- login
- openTo /learn/kan/review
- up
- see flashcard
- click reveal-answer-button
- see rating-again-button
- see rating-good-button
- notSee rating-hard-button
- notSee rating-easy-button
```

### 2. Insert notifications for badge testing (notifications.spec — future)

```markdown
setup: supabase.from('notification').insert({ uid: '[learner.key]', type: 'request_commented', body: 'Test notification', read_at: null })
cleanup: supabase.from('notification').delete().eq('uid', '[learner.key]').eq('body', 'Test notification')

learner:

- login
- openTo /learn
- up
- see notification-bell
- see notification-badge
```

### 3. Cleanup with [testStart] for mutation scenes (comments-and-answers.spec.skip.md)

```markdown
cleanup: supabase.from('request_comment').delete().eq('uid', '[friend.key]').gte('created_at', '[testStart]')

friend:

- login
- openTo /learn/hin/requests/3f8c9e2a-...
- click add-comment-button
- ...
```

## Execution order

Proposed: `cleanup (before)` → `setup` → `scene steps` → `cleanup (after)`

This ensures a clean slate (cleanup removes leftovers from previous runs), then setup establishes the required state, then the scene runs, then cleanup restores defaults.

## Blocked scenes

The following `.spec.skip.md` files contain scenes waiting on this feature:

- `review-answer-mode.spec.skip.md` — 2 scenes (verify 2-button UI, clear deck override)
- `comments-and-answers.spec.skip.md` — 4 scenes (post comment, reply, attach phrases, upvote with notifications)
- `playlists-hin-kan.spec.skip.md` — 3 scenes (create playlist, upvote playlist)
- `reviews.spec.skip.md` — 2 scenes (complete review stages, cross-device state)
