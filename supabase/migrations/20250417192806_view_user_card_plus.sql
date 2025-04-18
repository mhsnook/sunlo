create or replace view "public"."user_card_plus"
with
	("security_invoker" = 'true') as
select
	"deck"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."user_deck_id",
	"card"."created_at",
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability",
	current_timestamp,
	public.fsrs_retrievability (
		extract(
			epoch
			from
				(current_timestamp - review.created_at)
		) / 3600 / 24,
		review.stability
	) as "retrievability_now"
from
	(
		"public"."user_card" "card"
		join "public"."user_deck" "deck" on (("deck"."id" = "card"."user_deck_id"))
		left join (
			select
				rev.*
			from
				"public"."user_card_review" "rev"
				left join "public"."user_card_review" "rev2" on (
					rev.user_card_id = rev2.user_card_id
					and rev.created_at < rev2.created_at
				)
			where
				rev2.created_at is null
		) "review" on (("card"."id" = "review"."user_card_id"))
	)
