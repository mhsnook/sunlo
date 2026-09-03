---
name: Sunlo Release Manager
description: 'Cut a Sunlo release: prepare the open next-<version> branch for its merge into main. Regenerates the schema artifacts, runs the gates, bumps the version, writes the CHANGELOG entry, pushes. Carries the changelog voice rules. Triggers: prepare next-0.34 for deployment, prep the release, cut 0.34, prepare a new deployment.'
version: 1.0.0
---

# Sunlo Release Manager

Prepare the open `next-<version>` branch for its release merge into `main`: regenerate the schema artifacts, run the gates, bump the version, write the changelog entry, push.

Invoke when the developer says _"prepare next-0.34 for deployment,"_ _"prep the release,"_ _"cut 0.34"_ or similar.

**This skill never merges and never tags.** The developer merges `next-<version>` → `main` themselves and tags it `v<version>`. Say so when you hand off.

One rule governs the branching: **migrations only reach `main` through a `next-<version>` → `main` release merge.** A branch cut from `next-<version>` therefore PRs back into it — that is the rule's implication, not a second condition, and it is spelled out because the footgun is real (branch, open the PR, discover it targets `main`, fix the base).

`docs/deployment.md` has the rest. This skill covers only the release cut.

## What the branch looks like

Whether targeting `main` or a `next-<version>` branch, features and fixes get squash-merged, so the git log for `main` is one line per PR, and there's no need to worry about squashing and interactively rebasing on feature branches to keep the log tidy.

`git log --oneline origin/main..origin/next-<version>` is one input to the changelog. The other is what shipped straight to `main` — see step 5.

## 1. Read the state

```bash
git fetch origin main "next-<version>"
git log --oneline origin/main..origin/next-<version>          # one commit per PR
git merge-tree --write-tree origin/main origin/next-<version> >/dev/null \
  && echo "merges clean" || echo "CONFLICT"
```

Also check for open PRs still targeting the branch — a release cut with work in flight will need redoing. If one is close to merging, say so and let the developer decide whether to wait.

A commit that appears on both `main` and the branch with different hashes is usually a cherry-pick. Diff the two before worrying: identical content merges without conflict.

## 2. Regenerate the schema artifacts

Only when the branch added migrations.

```bash
pnpm db-reset && pnpm types && pnpm schema
```

**Review the `base.sql` diff closely.** A regeneration can silently drop the `supabase_realtime` publication list — `docs/database.md` warns about this and `src/lib/realtime-publication.test.ts` only catches part of it.

Without Docker (a Claude Code web session), `scripts/db-native.sh` validates that migrations apply and seeds load, but its `dump` and `types` go through `pg_dump` and a standalone `postgres-meta`, so the output is **not** byte-identical. Hand-edit `base.sql` and `src/types/supabase.ts` to match, and tell the developer they want a real regeneration locally before merging.

## 3. Run the gates

```bash
pnpm format          # oxfmt for TS/JS/CSS/MD/JSON, prettier for SQL
pnpm check           # tsc -b
pnpm lint            # oxlint then eslint
pnpm test:unit       # vitest
pnpm scene           # needs supabase running + a dev server
```

Report the lint warning count against the previous release's count rather than calling a standing warning a failure.

Then the build, which has a footgun (`docs/deployment.md`, "Build Environment Footgun"):

```bash
cp .env.example .env        # dummy-but-truthy VITE_SUPABASE_* values are enough
pnpm build
grep -l GoTrueClient dist/assets/*.js    # must match, or the SDK got tree-shaken out
```

Do not proceed on a failing gate. A skipped gate goes in the hand-off, named.

## 4. Bump the version

The branch name is the version: `next-0.34` → `0.34.0`, `next-0.28.1` → `0.28.1`. Do not ask which component to bump.

Edit `package.json` only. `pnpm-lock.yaml` does not record the root version, so `pnpm install` changes nothing — do not stage it.

## 5. Write the changelog entry

The entry covers **everything that changed since the last changelog entry**, not just the branch you are cutting. Fast-track work that went straight to `main` belongs here too, as one-liners in their own section below the migration-branch work:

```bash
git log --oneline <last-version-bump-commit>..origin/main
```

Add the entry above the previous version heading in `CHANGELOG.md`:

```markdown
## v0.34 - <Theme naming the two or three things that actually landed>

_3 September, 2026_

### Refactors
### Improvements
### Fixes
### Testing
### Also shipped to `main` since v<previous>
### Migrations
```

Use only the sections that have content, in that order.

### Keep it short

**One or two sentences per bullet.** A third is a smell; reach for it only on exceedingly gnarly work. The PR is one click away — do not reconstruct its reasoning, its mechanism, or its call-site counts.

The best bullet is three words and a PR number:

✅ Realtime threads #790
✅ Finish soft deletes #787
✅ #794 keeps archived phrases and translations off the reading surfaces.

❌ Any of those plus the RLS-frame mechanics, the table names, the trigger names, the view names, and how many read sites changed.

### Name the subject in every clause

Write "`phrasesFull` drops archived rows and `phrasesComposed` keeps them" — never "the pair", "one of them", "both halves", "that one". A reader should not have to work out which thing a clause is about.

### Migrations: describe the change, not the schema

The filename carries the technical detail and a reader can open the file.

✅ `20260831120000_enable_realtime_for_thread_tables.sql` — enables realtime for thread-related tables: comments, phrase links (from playlists or comments), phrase tags

❌ `20260831120000_enable_realtime_for_thread_tables.sql` — adds `request_comment`, `comment_phrase_link`, `playlist_phrase_link` and `phrase_tag` to the `supabase_realtime` publication, and re-opens the three link tables' SELECT policies to `using (true)`

### A "Testing" section is for changes to how we test

Every important change should have tests, so tests alone are not news. Include the section only when the way we test changed — a scenetest upgrade that changes how assertions work — or when the range of coverage moved notably. One new unit test is one line, or nothing.

✅ Added a new unit test to fail when a published table violates our soft-delete policy.

## 6. Commit and push

```bash
git add package.json CHANGELOG.md
git commit -m "Bump to v<version> and write its changelog entry"
git push -u origin "next-<version>"
```

If the push is rejected, a PR merged while you worked. Fetch, `git rebase origin/next-<version>`, re-run `pnpm check` and `pnpm test:unit`, and check whether the new PR needs a changelog bullet.

## 7. Hand off

Report, briefly:

- the version prepared, and the one-line-per-PR list going into it
- merge state against `main` (clean, or the conflict)
- every gate that ran, with its result — and every gate that did not run, with why
- anything deferred, and whether you opened a follow-up issue for it

Then remind the developer that merging `next-<version>` → `main` and `git tag v<version>` are theirs to do.

Offer a follow-up issue for anything the release leaves undone. Title it for the work, not the release — "Misc cleanups from release" tells a triager nothing.
