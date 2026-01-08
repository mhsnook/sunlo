create or replace view "public"."meta_phrase_request" as
select
	pr.id,
	pr.created_at,
	pr.requester_uid,
	pr.lang,
	pr.prompt,
	pr.status,
	pr.fulfilled_at,
	jsonb_build_object(
		'uid',
		pp.uid,
		'username',
		pp.username,
		'avatar_path',
		pp.avatar_path
	) as requester,
	jsonb_agg(mpi.*) filter (
		where
			(mpi.id is not null)
	) as phrases
from
	(
		(
			phrase_request pr
			left join public_profile pp on ((pr.requester_uid = pp.uid))
		)
		left join meta_phrase_info mpi on ((pr.id = mpi.request_id))
	)
group by
	pr.id,
	pr.created_at,
	pr.requester_uid,
	pr.lang,
	pr.prompt,
	pr.status,
	pr.fulfilled_at,
	pp.uid,
	pp.username,
	pp.avatar_path;
