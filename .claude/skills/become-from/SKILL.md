# Become-From

Formally initiate an architectural transformation — deprecate an old code pattern in favor of a new one. The skill name flips the grammar of `goto`/`come-from`: instead of "transform from X to Y," the verb is **become** and you say "become Y from X" (e.g. _"become-localfirst from useMutation,"_ _"become pure-PWA from the current mixed mode"_). The tracking issue is still labeled `transform` — that label stays.

Produces three durable artifacts: a documented standard in `CLAUDE.md`, an initial scan of the codebase, and a tracking issue labeled `transform` that automated tools (and future Claude sessions) can parse.

Invoke when the developer says something like _"become X from Y,"_ _"set up a become-from,"_ or _"/become-from."_

## When to use this

Use this skill when there's a clear **before → after** code pattern shift the developer wants to formalize and roll out gradually. Symptoms:

- "We should stop doing X and start doing Y everywhere."
- A new convention has emerged in one feature and should propagate.
- A library/API is being deprecated and replaced.

If the change is a one-shot refactor (small, fully completable in one PR), skip this skill — just do the refactor.

## Process

### 1. Interview

Ask the developer, conversationally — don't dump a form. Cover these four points:

1. **Old pattern** — what to stop doing. Get a concrete code example or grep-able string.
2. **New pattern** — what to do instead. Get a concrete code example.
3. **Motivation** — why the change. One or two sentences; this becomes the issue summary.
4. **Known exceptions** — places where the old pattern is intentionally kept (legacy compat, perf, third-party constraints, etc.). "None yet" is a valid answer.

Keep it short. If the developer's first message already answers some of these, don't re-ask.

### 2. Initial scan

Pick the most useful grep string for the old pattern (usually a literal substring, sometimes a regex). Run it against `src/`. If the pattern is implementation-only (not a test concept), exclude test files (`*.test.*`, `*.spec.*`, `e2e/`, `scenetest/`).

Example:

```bash
grep -rln 'old_pattern_string' src/ --exclude-dir=node_modules
```

Group results by directory (typically by feature: `src/features/<domain>/`, `src/routes/`, `src/components/`, `src/lib/`). Report:

- **Total file count**
- **File list grouped by directory**

If there are more than ~15 files, mentally group them into logical batches (by feature area) — you'll need this for the issue checklist in step 4.

### 3. Confirm before side effects

Before modifying `CLAUDE.md` or filing the issue, show the developer:

- The interview summary (old → new, motivation, exceptions)
- The grep string you'll use
- The scan results (count + grouped file list)
- A preview of the `CLAUDE.md` edit (which section, what to add/remove/demote)
- A preview of the issue title and body

Ask explicitly: _"Ready to file the issue and update CLAUDE.md?"_ Only proceed once the developer confirms.

### 4. Update CLAUDE.md

Find the most natural home for the new standard (e.g. "Mutations Pattern," "Styling Conventions," "Component Conventions"). Add a short block:

- The new pattern as the **current standard**, with a small example.
- A counter-example showing the old pattern, marked as deprecated, e.g.:

```markdown
**Deprecated** — do not use:

\`\`\`ts
// old pattern example
\`\`\`
```

If the old pattern is currently endorsed anywhere in `CLAUDE.md`, **remove or demote** that endorsement in the same edit. Don't leave conflicting guidance.

### 5. File the GitHub issue

Use the GitHub MCP tools (the repo is `mhsnook/sunlo`).

- **Label**: `transform`. If it doesn't exist, create it first (use a neutral color like `#5319e7` and a description such as _"Architectural transformation: deprecating an old pattern in favor of a new one"_).
- **Title**: `Transform: <short description>` (e.g. `Transform: replace page.goto with UI navigation in e2e tests`).
- **Body**: must follow this exact structure so automated tools can parse it. Section headers and order are load-bearing — do not rename or reorder.

```
## Summary
[one paragraph: what's changing and why]

## Old pattern
[code block showing what to stop doing]

## New pattern
[code block showing what to do instead]

## Grep hint
[the exact string or regex to search for the old pattern in src/]

## Known exceptions
[bullet list, or "None yet" if empty]

## Initial scan
[auto-populated: count + file list from step 2]
```

If the initial scan found **more than ~15 files**, append a GitHub task checklist below `## Initial scan`, grouping files into logical batches (by feature area or directory). Example:

```
## Migration batches

### Batch 1 — features/deck (4 files)
- [ ] src/features/deck/hooks.ts
- [ ] src/features/deck/mutations.ts
- [ ] src/features/deck/collections.ts
- [ ] src/features/deck/schemas.ts

### Batch 2 — features/review (3 files)
- [ ] ...
```

Each unchecked box becomes a trackable unit of progress.

### 6. Report back

Reply with:

- Link to the filed issue
- Summary of the `CLAUDE.md` change (section + a one-line description)
- Suggested next step: _"Pick a batch and start migrating, or hand the issue to another session."_

## Notes

- **Don't migrate any files in this skill.** This skill only initiates the transformation — the actual migration happens in follow-up PRs that close batches/issues.
- **One transform = one issue.** If the developer describes two unrelated patterns, ask which to file first; offer to run the skill again for the second.
- **Grep hint quality matters.** Future automated tools will use it as the canonical search string. If the literal pattern is too noisy (e.g. matches unrelated code), prefer a regex that's specific enough to avoid false positives.
- **Exceptions are durable.** If the developer adds an exception later, it should be edited into the issue body's `## Known exceptions` section, not posted as a comment.
