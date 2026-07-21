-- Slim user_deck_plus down to the base user_deck columns.
--
-- The per-deck aggregates it used to compute (cards_active/learned/skipped,
-- count_reviews_7d[_positive], most_recent_review_at) are now derived on the
-- client from cardsCollection / cardReviewsCollection — see useDeckCardStats /
-- useDeckReviewCounts. `language` and `lang_total_phrases` duplicated
-- meta_language metadata already loaded on every client (languagesCollection:
-- name, phrases_to_learn). With those gone the view is a plain passthrough of
-- user_deck, so it no longer joins user_card or subqueries phrase/user_card_review.
--
-- Column set changes, so drop-and-recreate (CREATE OR REPLACE can't drop
-- columns). security_invoker keeps the underlying user_deck RLS in force.
drop view if exists "public"."user_deck_plus";

create or replace view "public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	"d"."preferred_translation_lang",
	"d"."review_answer_mode",
	"d"."created_at"
from
	"public"."user_deck" "d";
