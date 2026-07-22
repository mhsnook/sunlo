-- Slim user_deck_plus to a passthrough of the base user_deck columns: the
-- per-deck card/review aggregates and the language/phrase-count columns are now
-- computed client-side. Drop-and-recreate because the column set shrinks
-- (CREATE OR REPLACE can't drop columns); security_invoker keeps user_deck RLS.
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
