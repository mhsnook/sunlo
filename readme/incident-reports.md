# Incident Reports

Production outages and their root causes, so we don't repeat them.

---

## 2026-04-01 — "CONCURRENTLY cannot be used" when adding phrases

**Severity:** High — all users blocked from adding phrases
**Duration:** v0.18.0 release until v0.18.1 hotfix
**PR:** #493

### What happened

Users saw the error "CONCURRENTLY cannot be used when the materialized view is not populated" when submitting the add-phrase form (`/learn/$lang/phrases/new`).

### Root cause

Migration `20260330100000_fix_count_learners_rls.sql` dropped and recreated the `phrase_search_index` materialized view with `WITH NO DATA` but **never repopulated it**. The refresh function (`refresh_phrase_search_index`) has an `ispopulated` guard that falls back to a non-concurrent refresh, but the view still needs to be populated at least once after creation. The trigger that fires on phrase insert called this function, which hit the Postgres error.

### Fix

New migration (`20260401100000`) runs `REFRESH MATERIALIZED VIEW phrase_search_index;` to populate it.

### Lesson

When a migration drops and recreates a materialized view with `WITH NO DATA`, always add a `REFRESH MATERIALIZED VIEW <name>;` at the end of the migration to populate it. This applies to both `phrase_search_index` and `meta_language`.
