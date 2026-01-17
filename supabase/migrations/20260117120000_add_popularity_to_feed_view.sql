-- Add a unified popularity column to feed_activities view for sorting
-- Requests and playlists use upvote_count, phrases use count_learners
drop view if exists "public"."feed_activities";

create or replace view "public"."feed_activities" as
select
	pr.id,
	'request'::text as type,
	pr.created_at,
	pr.lang,
	pr.requester_uid as uid,
	coalesce(pr.upvote_count, 0) as popularity,
	jsonb_build_object('prompt', pr.prompt, 'upvote_count', pr.upvote_count) as payload
from
	public.phrase_request pr
where
	pr.deleted = false
union all
select
	pp.id,
	'playlist'::text as type,
	pp.created_at,
	pp.lang,
	pp.uid,
	coalesce(pp.upvote_count, 0) as popularity,
	jsonb_build_object(
		'title',
		pp.title,
		'description',
		pp.description,
		'upvote_count',
		pp.upvote_count,
		'phrase_count',
		(
			select
				count(*)
			from
				public.playlist_phrase_link
			where
				playlist_phrase_link.playlist_id = pp.id
		)
	) as payload
from
	public.phrase_playlist pp
where
	pp.deleted = false
union all
select distinct
	on (p.id) p.id,
	'phrase'::text as type,
	p.created_at,
	p.lang,
	p.added_by as uid,
	coalesce(p.count_learners, 0) as popularity,
	jsonb_build_object(
		'text',
		p.text,
		'source',
		case
			when cpl.request_id is not null then jsonb_build_object(
				'type',
				'request',
				'id',
				cpl.request_id,
				'comment_id',
				cpl.comment_id
			)
			when ppl.playlist_id is not null then jsonb_build_object(
				'type',
				'playlist',
				'id',
				ppl.playlist_id,
				'title',
				playlist.title,
				'follows',
				p.count_learners::integer
			)
			else null::jsonb
		end
	) as payload
from
	public.phrase_meta p
	left join public.comment_phrase_link cpl on p.id = cpl.phrase_id
	left join public.playlist_phrase_link ppl on p.id = ppl.phrase_id
	left join public.phrase_playlist playlist on ppl.playlist_id = playlist.id
where
	p.added_by is not null
	and cpl.id is null
	and ppl.id is null;

alter table "public"."feed_activities" owner to "postgres";
