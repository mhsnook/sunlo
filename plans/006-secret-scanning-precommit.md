# Plan 006: Add pre-commit secret scanning

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 1c4b60ef..HEAD -- .husky/pre-commit package.json .gitignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security

- **Planned at**: commit `1c4b60ef`, 2026-07-08

## Why this matters

The working tree contains live credentials in local env files: `.env` (third-party API keys for a vector DB, an LLM gateway, a CDN provider, plus an app-update signing private key and its password) and `supabase/functions/.env` (an LLM gateway key and the **Supabase service-role key**, which bypasses RLS entirely). Both files are correctly gitignored and — verified during planning — have **never appeared in git history** (`git log --all -- .env supabase/functions/.env` is empty). But nothing currently prevents the next slip: a renamed copy (`.env.backup`), a key pasted into a script or scene config, or a debug commit. One bad commit burns keys across four services and, this being a public repo (`"private": false` in package.json), burns them instantly. A pre-commit scanner makes the mistake mechanically impossible instead of relying on vigilance.

**Handling rule for this plan**: never write any actual secret value into any file, log, test fixture, or report. Use obviously fake values in tests.

## Current state

- `.husky/pre-commit` — currently:

  ```sh
  pnpm exec lint-staged
  #pnpm format:check && pnpm exec lint-staged
  # pnpm run lint

  #echo '\n✅✅✅✅ Everything looks good! I am committing this now. ✅✅✅✅\n'
  ```

- `package.json` has `husky` (^9) and `lint-staged` (^17) as devDependencies; `"prepare": "husky"` script. The lint-staged config location: grep for `lint-staged` keys in `package.json` or a `.lintstagedrc*` file — at planning time no `.lintstagedrc` file was seen at root and package.json shows only the devDependency, so find where the lint-staged config actually lives before editing (it may be in `package.json` under a `lint-staged` key — read the whole file — or the hook may rely on defaults).
- `.gitignore` covers `.env` (line 18, matches at any depth) and `.env*.local` (line 31).
- Package manager: pnpm 10 (`packageManager` field). Repo is public.

## Commands you will need

| Purpose                        | Command                                                               | Expected on success      |
| ------------------------------ | --------------------------------------------------------------------- | ------------------------ |
| Install dep                    | `pnpm add -D secretlint @secretlint/secretlint-rule-preset-recommend` | exit 0, lockfile updated |
| Run scanner manually           | `pnpm exec secretlint "**/*"`                                         | exit 0 on clean tree     |
| Typecheck (unaffected, sanity) | `pnpm check`                                                          | exit 0                   |

Note: installing devDependencies is a normal part of executing this plan (the advisor could not; you can).

## Scope

**In scope**:

- `package.json`, `pnpm-lock.yaml` (new devDependencies)
- `.secretlintrc.json` (create)
- `.secretlintignore` (create, if needed)
- `.husky/pre-commit` (add the scan)

**Out of scope** (do NOT touch):

- `.env`, `supabase/functions/.env` themselves — do not read them beyond confirming they're ignored, do not move/edit them.
- CI workflows (`.github/workflows/`) — a CI-side scan is a reasonable follow-up but needs an operator decision on secrets-in-CI policy; note it, don't do it.
- Git history rewriting of any kind.

## Git workflow

- Branch: `advisor/006-secret-scanning`, based on `main`. Fast track.
- Single commit, e.g. `Add secretlint to pre-commit`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install and configure secretlint

```sh
pnpm add -D secretlint @secretlint/secretlint-rule-preset-recommend
```

Create `.secretlintrc.json`:

```json
{
	"rules": [
		{
			"id": "@secretlint/secretlint-rule-preset-recommend"
		}
	]
}
```

**Verify**: `pnpm exec secretlint "**/*"` → runs and exits 0 (gitignored files like `.env` are excluded by default because secretlint respects `.gitignore`; if it reports the env files anyway, add them to a `.secretlintignore`). If it flags real existing tracked files, STOP condition (see below).

### Step 2: Wire into the pre-commit hook

Prefer wiring through the existing lint-staged config so only staged files are scanned (fast):

- If lint-staged config exists (see "Current state" — locate it first), add an entry like `"*": ["secretlint"]` alongside existing entries (secretlint ignores binary files gracefully; if that proves noisy, scope to `"*.{ts,tsx,js,json,md,sql,sh,toml,yaml,yml,env*}"`).
- If no lint-staged config exists (hook may be running lint-staged with an implicit/empty config), instead append a line to `.husky/pre-commit`:

  ```sh
  pnpm exec secretlint --secretlintignore .gitignore $(git diff --cached --name-only --diff-filter=ACM | tr '\n' ' ')
  ```

  (Guard for the empty-staged-list case: skip when no files are staged.)

Keep `pnpm exec lint-staged` as the first line; do not disturb the commented lines.

**Verify**: `git commit` of a trivial whitespace change to this plan file succeeds (hook passes on clean content). Revert the test commit if it was only for verification (`git reset --soft HEAD~1`) or keep it if meaningful.

### Step 3: Prove it blocks a secret

Create a throwaway file `scratch-secret-test.ts` containing an obviously fake but pattern-matching credential, e.g. a string assigned from `"sk-or-v1-"` + 64 hex chars (construct it in the file as a single literal — this is a FAKE value you invent, never a real one). Stage it and attempt `git commit -m test`.

**Verify**: the commit is REJECTED with a secretlint error naming the file. Then `git reset HEAD scratch-secret-test.ts && rm scratch-secret-test.ts`.

### Step 4: History re-verification (belt and suspenders)

Re-run the planning-time check and record the output in your report:

```sh
git log --all --oneline -- .env supabase/functions/.env
```

**Verify**: empty output (the files have never been tracked). If NOT empty, STOP condition.

## Test plan

Steps 2–4 are the tests (hook passes clean, blocks a planted fake, history is clean). No vitest files.

## Done criteria

- [ ] `secretlint` + preset in devDependencies; `.secretlintrc.json` present
- [ ] Pre-commit hook rejects a staged fake credential (step 3 done and reverted)
- [ ] Pre-commit hook passes on the clean tree
- [ ] `git log --all -- .env supabase/functions/.env` output recorded as empty
- [ ] `pnpm check` and `pnpm lint` still exit 0
- [ ] No secret values appear anywhere in the diff, this plan, or your report
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm exec secretlint "**/*"` flags any **tracked** file on the clean tree — that would mean a real credential-looking string is already committed; report the file:line and credential type ONLY (never the value) and stop. Remediation (rotation + removal) is an operator decision.
- `git log` over the env paths is non-empty (a secret has history — rotation required; operator decision).
- The hook adds more than ~2s to a typical commit (measure with `time git commit`); report and let the operator choose between staged-only scoping and dropping the preset for targeted rules.

## Maintenance notes

- The recommend-preset updates its detection patterns over time — routine `pnpm update` picks those up.
- Follow-up candidates (deliberately not done here): a CI job running secretlint over the full tree on PRs; proactive rotation of the service-role + signing keys as pure precaution (they have no known exposure, so this is optional hygiene the operator may skip).
- If a future legitimate file trips false positives (e.g. seed data with token-shaped strings), prefer inline `// secretlint-disable-line` over ignoring whole paths.
