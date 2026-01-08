create or replace view "public"."meta_phrase_info"
with
	(security_invoker = false) as (
		with
			recent_review as (
				select
					r1.id,
					r1.uid,
					r1.user_card_id,
					r1.score,
					r1.difficulty,
					r1.stability,
					r1.review_time_retrievability,
					r1.created_at,
					r1.updated_at,
					r1.user_deck_id
				from
					(
						user_card_review r1
						left join user_card_review r2 on (
							(
								(r1.user_card_id = r2.user_card_id)
								and (r1.created_at < r2.created_at)
							)
						)
					)
				where
					(r2.created_at is null)
			),
			card_with_recentest_review as (
				select distinct
					c.id,
					c.phrase_id,
					c.status,
					r.difficulty,
					r.stability,
					r.created_at as recentest_review_at
				from
					(
						user_card c
						join recent_review r on ((c.id = r.user_card_id))
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
					count(distinct c.id) as count_cards,
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
					lang
				order by
					avg_difficulty asc nulls last
			) as rank_least_difficult,
			rank() over (
				partition by
					lang
				order by
					avg_stability desc nulls last
			) as rank_most_stable,
			rank() over (
				partition by
					lang
				order by
					case
						when count_cards > 0 then (count_skipped::numeric / count_cards::numeric)
					end asc nulls last
			) as rank_least_skipped,
			rank() over (
				partition by
					lang
				order by
					case
						when count_cards > 0 then (count_learned::numeric / count_cards::numeric)
					end desc nulls last
			) as rank_most_learned,
			rank() over (
				partition by
					lang
				order by
					created_at desc
			) as rank_newest
		from
			results
	);
