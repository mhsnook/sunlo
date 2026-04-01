-- Fix: phrase_search_index was recreated WITH NO DATA in migration
-- 20260330100000_fix_count_learners_rls.sql but never populated.
-- This causes "CONCURRENTLY cannot be used when the materialized view
-- is not populated" when any trigger tries to refresh it (e.g. adding
-- a phrase).
REFRESH MATERIALIZED VIEW phrase_search_index;
