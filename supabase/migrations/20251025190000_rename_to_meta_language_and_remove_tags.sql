drop view public.language_plus;

create view public.meta_language as
with
	first as (
		select
			l.lang,
			l.name,
			l.alias_of,
			(
				select
					count(distinct d.uid) as count
				from
					user_deck d
				where
					l.lang::text = d.lang::text
			) as learners,
			(
				select
					count(distinct p.id) as count
				from
					phrase p
				where
					l.lang::text = p.lang::text
			) as phrases_to_learn
		from
			language l
		group by
			l.lang,
			l.name,
			l.alias_of
	),
	second as (
		select
			first.lang,
			first.name,
			first.alias_of,
			first.learners,
			first.phrases_to_learn,
			first.learners * first.phrases_to_learn as display_score
		from
			first
		order by
			(first.learners * first.phrases_to_learn) desc
	)
select
	second.lang,
	second.name,
	second.alias_of,
	second.learners,
	second.phrases_to_learn,
	rank() over (
		order by
			second.display_score desc
	) as rank,
	rank() over (
		order by
			second.display_score desc,
			second.name
	) as display_order
from
	second;
