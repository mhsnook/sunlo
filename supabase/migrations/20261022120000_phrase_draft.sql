-- A draft phrase is one whose text or first translation came from a machine
-- and that no person has confirmed yet. The client sets `draft` on insert;
-- only `confirm_draft_phrase` clears it, because the phrase UPDATE policy is
-- admin-only and a fluent speaker who is not an admin must still be able to
-- confirm.
alter table public.phrase
add column draft boolean not null default false;

comment on column public.phrase.draft is 'True until a person confirms the text and its first translation. Set when the content came from a machine (e.g. photo extraction) and the creator did not confirm it. Cleared by confirm_draft_phrase.';

-- `create or replace view` can only append columns, so `draft` goes last.
create or replace view public.phrase_meta
with
	(security_invoker = true) as
with
	tags as (
		select
			pt.phrase_id as t_phrase_id,
			(
				json_agg(distinct jsonb_build_object('id', tag.id, 'name', tag.name)) filter (
					where
						(tag.id is not null)
				)
			)::jsonb as tags
		from
			(
				public.phrase_tag pt
				left join public.tag tag on ((tag.id = pt.tag_id))
			)
		where
			(pt.deleted = false)
		group by
			pt.phrase_id
	)
select
	phrase.id,
	phrase.lang,
	phrase.text,
	phrase.created_at,
	phrase.added_by,
	phrase.only_reverse,
	phrase.archived,
	coalesce(stats.count_learners, (0)::bigint) as count_learners,
	stats.avg_difficulty,
	stats.avg_stability,
	coalesce(tags.tags, '[]'::jsonb) as tags,
	phrase.updated_at,
	phrase.draft
from
	(
		(
			public.phrase phrase
			left join public.phrase_stats stats on ((stats.phrase_id = phrase.id))
		)
		left join tags on ((tags.t_phrase_id = phrase.id))
	);

create or replace function public.confirm_draft_phrase (p_phrase_id uuid) returns public.phrase language plpgsql security definer
set
	search_path = '' as $$
declare
	v_phrase public.phrase;
begin
	select * into v_phrase from public.phrase where id = p_phrase_id and archived = false;
	if not found then
		raise exception 'Phrase % not found', p_phrase_id using errcode = 'P0002';
	end if;

	if not (
		public.is_admin()
		or exists (
			select 1
			from public.user_profile profile,
				jsonb_array_elements(profile.languages_known) as known
			where profile.uid = auth.uid()
				and known ->> 'lang' = v_phrase.lang
				and known ->> 'level' = 'fluent'
		)
	) then
		raise exception 'Only fluent speakers of this language can confirm a draft phrase'
			using errcode = '42501';
	end if;

	update public.phrase set draft = false where id = p_phrase_id
	returning * into v_phrase;
	return v_phrase;
end;
$$;

revoke all on function public.confirm_draft_phrase (uuid)
from
	public,
	anon;

grant
execute on function public.confirm_draft_phrase (uuid) to authenticated,
service_role;
