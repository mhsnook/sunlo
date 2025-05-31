alter table "public"."user_card"
drop constraint "ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop constraint "user_card_user_deck_id_fkey";

alter table "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card" validate constraint "user_card_lang_uid_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_card_id_fkey";

alter table "public"."user_card_review"
drop constraint "user_card_review_user_deck_id_fkey";

drop view if exists "public"."meta_phrase_info";

drop view if exists "public"."user_card_plus";

drop view if exists "public"."user_deck_plus";

drop index if exists "public"."ensure_phrases_unique_within_deck";

alter table "public"."user_card"
drop column "user_deck_id";

alter table "public"."user_card_review"
drop column "user_deck_id";

alter table "public"."user_card_review"
alter column "phrase_id"
set not null;

alter table "public"."user_card_review"
alter column "user_card_id"
drop not null;

alter table "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key (lang, uid) references user_deck (lang, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_lang_uid_fkey";

alter table "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key (phrase_id, uid) references user_card (phrase_id, uid) not valid;

alter table "public"."user_card_review" validate constraint "user_card_review_phrase_id_uid_fkey";

create or replace view
	"public"."meta_phrase_info" as
with
	recent_review as (
		select
			r1.id,
			r1.uid,
			r1.phrase_id,
			r1.lang,
			r1.score,
			r1.difficulty,
			r1.stability,
			r1.review_time_retrievability,
			r1.created_at,
			r1.updated_at
		from
			(
				user_card_review r1
				left join user_card_review r2 on (
					(
						(r1.phrase_id = r2.phrase_id)
						and (r1.created_at < r2.created_at)
					)
				)
			)
		where
			(r2.created_at is null)
	),
	card_with_recentest_review as (
		select distinct
			c.phrase_id,
			c.status,
			r.difficulty,
			r.stability,
			r.created_at as recentest_review_at
		from
			(
				user_card c
				join recent_review r on ((c.phrase_id = r.phrase_id))
			)
	),
	results as (
		select
			p.id,
			p.created_at,
			p.lang,
			p.text,
			avg(c.difficulty) as avg_difficulty,
			avg(c.stability) as avg_stability,
			count(distinct c.phrase_id) as count_cards,
			sum(
				case
					when (c.status = 'active'::card_status) then 1
					else 0
				end
			) as count_active,
			sum(
				case
					when (c.status = 'learned'::card_status) then 1
					else 0
				end
			) as count_learned,
			sum(
				case
					when (c.status = 'skipped'::card_status) then 1
					else 0
				end
			) as count_skipped
		from
			(
				phrase p
				left join card_with_recentest_review c on ((c.phrase_id = p.id))
			)
		group by
			p.id,
			p.lang,
			p.text
	)
select
	results.id,
	results.created_at,
	results.lang,
	results.text,
	results.avg_difficulty,
	results.avg_stability,
	results.count_cards,
	results.count_active,
	results.count_learned,
	results.count_skipped,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_active / results.count_cards))::numeric, 2)
	end as percent_active,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_learned / results.count_cards))::numeric, 2)
	end as percent_learned,
	case
		when (results.count_cards = 0) then null::numeric
		else round(((results.count_skipped / results.count_cards))::numeric, 2)
	end as percent_skipped,
	rank() over (
		partition by
			results.lang
		order by
			results.avg_difficulty
	) as rank_least_difficult,
	rank() over (
		partition by
			results.lang
		order by
			results.avg_stability desc nulls last
	) as rank_most_stable,
	rank() over (
		partition by
			results.lang
		order by
			case
				when (results.count_cards > 0) then (
					(results.count_skipped)::numeric / (results.count_cards)::numeric
				)
				else null::numeric
			end
	) as rank_least_skipped,
	rank() over (
		partition by
			results.lang
		order by
			case
				when (results.count_cards > 0) then (
					(results.count_learned)::numeric / (results.count_cards)::numeric
				)
				else null::numeric
			end desc nulls last
	) as rank_most_learned,
	rank() over (
		partition by
			results.lang
		order by
			results.created_at desc
	) as rank_newest
from
	results;

create or replace view
	"public"."user_card_plus" as
select
	card.lang,
	card.id,
	card.uid,
	card.status,
	card.phrase_id,
	card.created_at,
	card.updated_at,
	review.created_at as last_reviewed_at,
	review.difficulty,
	review.stability,
	current_timestamp as "current_timestamp",
	fsrs_retrievability (
		(
			(
				extract(
					epoch
					from
						(current_timestamp - review.created_at)
				) / (3600)::numeric
			) / (24)::numeric
		),
		review.stability
	) as retrievability_now
from
	(
		user_card card
		left join (
			select
				rev.id,
				rev.uid,
				rev.phrase_id,
				rev.score,
				rev.difficulty,
				rev.stability,
				rev.review_time_retrievability,
				rev.created_at,
				rev.updated_at
			from
				(
					user_card_review rev
					left join user_card_review rev2 on (
						(
							(rev.user_card_id = rev2.user_card_id)
							and (rev.created_at < rev2.created_at)
						)
					)
				)
			where
				(rev2.created_at is null)
		) review on ((card.phrase_id = review.phrase_id))
	);

create or replace view
	"public"."user_deck_plus" as
select
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	(
		select
			l.name
		from
			language l
		where
			((l.lang)::text = (d.lang)::text)
		limit
			1
	) as language,
	d.created_at,
	count(*) filter (
		where
			(c.status = 'learned'::card_status)
	) as cards_learned,
	count(*) filter (
		where
			(c.status = 'active'::card_status)
	) as cards_active,
	count(*) filter (
		where
			(c.status = 'skipped'::card_status)
	) as cards_skipped,
	(
		select
			count(*) as count
		from
			phrase p
		where
			((p.lang)::text = (d.lang)::text)
	) as lang_total_phrases,
	(
		select
			max(c.created_at) as max
		from
			user_card_review r
		where
			((r.lang)::text = (d.lang)::text)
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
				and (r.score >= 2)
			)
		limit
			1
	) as count_reviews_7d_positive
from
	(
		user_deck d
		left join user_card c on (((d.lang)::text = (c.lang)::text))
	)
group by
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.created_at
order by
	(
		select
			count(*) as count
		from
			user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	d.created_at desc;