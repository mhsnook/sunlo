alter table "public"."user_card_scheduled"
add constraint "user_card_scheduled_score_check" check ((score = any (array[1, 2, 3, 4]))) not valid;

alter table "public"."user_card_scheduled" validate constraint "user_card_scheduled_score_check";

alter table "public"."user_card_scheduled"
add constraint "user_card_scheduled_review_time_difficulty_check" check (
	(
		(review_time_difficulty >= 0.0)
		and (review_time_difficulty <= 10.0)
	)
) not valid;

alter table "public"."user_card_scheduled" validate constraint "user_card_scheduled_review_time_difficulty_check";

alter table "public"."user_card_scheduled"
add constraint "user_card_scheduled_review_time_stability_check" check ((review_time_stability >= 0.0)) not valid;

alter table "public"."user_card_scheduled" validate constraint "user_card_scheduled_review_time_stability_check";

alter table "public"."user_card_scheduled"
add constraint "user_card_scheduled_user_deck_id_fkey" foreign key (user_deck_id) references user_deck (id) on update cascade on delete cascade not valid;

alter table "public"."user_card_scheduled" validate constraint "user_card_scheduled_user_deck_id_fkey";
