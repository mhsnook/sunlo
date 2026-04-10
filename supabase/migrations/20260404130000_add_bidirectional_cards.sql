-- Bidirectional Cards (issue #310)
-- Each phrase can have two independently-scheduled cards: forward and reverse.
-- Forward: phrase → translation; Reverse: translation → phrase.
-- 1. Create the direction enum
do $$ begin
  create type public.card_direction as enum('forward', 'reverse');
exception when duplicate_object then null;
end $$;

-- 2. Add direction column to user_card (existing cards become 'forward' by default)
alter table public.user_card
add column direction public.card_direction not null default 'forward';

-- 3. Drop the old unique constraint and create a new one including direction
--    The FK user_card_review_phrase_id_uid_fkey depends on uid_card, so drop it first.
alter table public.user_card_review
drop constraint if exists "user_card_review_phrase_id_uid_fkey";

alter table public.user_card
drop constraint if exists "user_card_uid_phrase_id_key";

drop index if exists "public"."user_card_uid_phrase_id_key";

drop index if exists "public"."uid_card";

create unique index user_card_uid_phrase_id_direction_key on public.user_card using btree (uid, phrase_id, direction);

alter table public.user_card
add constraint "user_card_uid_phrase_id_direction_key" unique using index "user_card_uid_phrase_id_direction_key";

-- 4a. Add direction column to user_card_review (FK is added after the backfill below,
--     so the constraint isn't in place while we're correcting the direction values)
alter table public.user_card_review
add column direction public.card_direction not null default 'forward';

-- 5. Backfill directions
--
-- only_reverse phrases were always shown as reverse cards (translation → phrase).
-- Their existing user_card and user_card_review rows were created before this column
-- existed, so they defaulted to 'forward' — fix them now.
update public.user_card
set
	direction = 'reverse'
where
	phrase_id in (
		select
			id
		from
			public.phrase
		where
			only_reverse = true
	);

update public.user_card_review
set
	direction = 'reverse'
where
	phrase_id in (
		select
			id
		from
			public.phrase
		where
			only_reverse = true
	);

-- For every normal (non-only_reverse) forward card, create a new reverse card.
-- These are genuinely new cards — the user has never seen this phrase in reverse —
-- so they start with no review history (fresh scheduling).
insert into
	public.user_card (uid, lang, phrase_id, status, direction)
select
	uid,
	lang,
	phrase_id,
	status,
	'reverse'::public.card_direction
from
	public.user_card
where
	direction = 'forward'
on conflict on constraint "user_card_uid_phrase_id_direction_key" do nothing;

-- 4b. Now that data is consistent, add the FK on (uid, phrase_id, direction)
alter table public.user_card_review
add constraint "user_card_review_phrase_id_uid_fkey" foreign key ("uid", "phrase_id", "direction") references public.user_card ("uid", "phrase_id", "direction");

-- 6. Update user_card_plus view to include direction and join correctly
-- Adding direction column in the middle requires drop+create (CREATE OR REPLACE
-- can only append columns). phrase_meta and feed_activities no longer depend on
-- user_card_plus (they use phrase_stats since 20260330), so only this view needs
-- to be dropped.
drop view if exists public.user_card_plus;

create or replace view "public"."user_card_plus"
with
	("security_invoker" = 'true') as
with
	review as (
		select
			rev.id,
			rev.uid,
			rev.score,
			rev.difficulty,
			rev.stability,
			rev.review_time_retrievability,
			rev.created_at,
			rev.updated_at,
			rev.day_session,
			rev.lang,
			rev.phrase_id,
			rev.direction
		from
			(
				user_card_review rev
				left join user_card_review rev2 on (
					(
						(rev.phrase_id = rev2.phrase_id)
						and (rev.uid = rev2.uid)
						and (rev.direction = rev2.direction)
						and (rev.created_at < rev2.created_at)
					)
				)
			)
		where
			(rev2.created_at is null)
	)
select
	card.lang,
	card.id,
	card.uid,
	card.status,
	card.phrase_id,
	card.direction,
	card.created_at,
	card.updated_at,
	review.created_at as last_reviewed_at,
	review.difficulty,
	review.stability,
	current_timestamp as "current_timestamp",
	-- Pure SQL retrievability: (1 + f * (days / stability)) ^ c
	-- f = 19/81, c = -0.5
	nullif(
		power(
			1.0 + (19.0 / 81.0) * (
				extract(
					epoch
					from
						(current_timestamp - review.created_at)
				) / 3600.0 / 24.0
			) / nullif(review.stability, 0),
			-0.5
		),
		'NaN'::numeric
	) as retrievability_now
from
	(
		user_card card
		left join review on (
			(card.phrase_id = review.phrase_id)
			and (card.uid = review.uid)
			and (card.direction = review.direction)
		)
	);

-- 7. Update add_phrase_translation_card to create both direction cards
create or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text",
	"create_card" boolean default true,
	"phrase_only_reverse" boolean default false
) returns "json" language "plpgsql" as $$
DECLARE
	new_phrase public.phrase;
	new_translation public.phrase_translation;
	new_card_forward public.user_card;
	new_card_reverse public.user_card;
BEGIN
	-- Insert a new phrase with only_reverse flag
	INSERT INTO public.phrase (text, lang, text_script, only_reverse)
	VALUES (phrase_text, phrase_lang, phrase_text_script, phrase_only_reverse)
	RETURNING * INTO new_phrase;

	-- Insert the translation for the new phrase
	INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
	VALUES (new_phrase.id, translation_text, translation_lang, translation_text_script)
	RETURNING * INTO new_translation;

	-- Create cards based on direction rules
	IF create_card THEN
		IF NOT phrase_only_reverse THEN
			-- Create forward card for standard phrases
			INSERT INTO public.user_card (phrase_id, status, lang, direction)
			VALUES (new_phrase.id, 'active', phrase_lang, 'forward')
			RETURNING * INTO new_card_forward;
		END IF;

		-- Always create reverse card
		INSERT INTO public.user_card (phrase_id, status, lang, direction)
		VALUES (new_phrase.id, 'active', phrase_lang, 'reverse')
		RETURNING * INTO new_card_reverse;
	END IF;

	RETURN json_build_object(
		'phrase', row_to_json(new_phrase),
		'translation', row_to_json(new_translation),
		'card', CASE
			WHEN new_card_forward IS NOT NULL THEN row_to_json(new_card_forward)
			ELSE row_to_json(new_card_reverse)
		END,
		'card_reverse', CASE
			WHEN new_card_forward IS NOT NULL THEN row_to_json(new_card_reverse)
			ELSE NULL
		END
	);
END;
$$;
