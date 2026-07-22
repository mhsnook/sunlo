-- Drop user_deck_plus. Its per-deck card/review aggregates and the
-- language/phrase-count columns are computed client-side now, so decksCollection
-- reads the base user_deck table directly (owner-only RLS already scopes it).
-- If the aggregates ever return, they'll come back as a table maintained by a
-- trigger/cron that the WAL can stream — not a view.
drop view if exists "public"."user_deck_plus";
