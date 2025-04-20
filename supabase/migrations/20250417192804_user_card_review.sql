create table public.user_card_review (
	id uuid not null default gen_random_uuid (),
	uid uuid not null default auth.uid (),
	user_card_id uuid not null,
	score smallint not null,
	difficulty numeric null,
	stability numeric null,
	review_time_retrievability numeric null,
	created_at timestamp with time zone not null default now(),
	updated_at timestamp with time zone not null default now(),
	user_deck_id uuid not null,
	constraint user_card_review_pkey primary key (id),
	constraint user_card_review_user_card_id_fkey foreign KEY (user_card_id) references user_card (id) on update cascade on delete set null,
	constraint user_card_review_user_deck_id_fkey foreign KEY (user_deck_id) references user_deck (id) on update cascade on delete set null,
	constraint user_card_review_difficulty_check check (
		(
			(difficulty >= 0.0)
			and (difficulty <= 10.0)
		)
	),
	constraint user_card_review_stability_check check ((stability >= 0.0)),
	constraint user_card_review_score_check check ((score = any (array[1, 2, 3, 4])))
) TABLESPACE pg_default;

alter table "public"."user_card_review" enable row level security;

create policy "Enable insert for authenticated users only" on "public"."user_card_review" as permissive for insert to authenticated
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable users to update their own data only" on "public"."user_card_review" as permissive
for update
	to authenticated using (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	)
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable users to view their own data only" on "public"."user_card_review" as permissive for
select
	to authenticated using (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);
