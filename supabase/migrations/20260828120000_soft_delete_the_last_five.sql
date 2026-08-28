-- Soft-delete the last five hard-deleted tables (#786).
--
-- Every removal in the app is now an UPDATE on both sides of the wire. Two
-- reasons, both from docs/mutations.md:
--
--   * Supabase skips the RLS check on a DELETE frame, so every delete on a
--     published table reaches every subscriber, whoever owned the row.
--   * A DELETE frame carries only the replica identity, so realtime cannot
--     describe the deleted row without `replica identity full`, which would
--     broadcast every column of every deleted row.
--
-- `message_tag` already carries `archived` (20260527120000) and needed no
-- schema change; only its unused client handler goes.
-- 1. The guard. Three of these tables are pure join rows: nothing about them
-- is editable except the new flag. The guard pins every column but `deleted`,
-- so opening UPDATE does not also let a client repoint a link at another row.
--
-- This is `guard_upvote_update` under a name that says what it does rather
-- than which tables first needed it. The three upvote triggers move onto it
-- and the old function goes, so the rule has one home.
create or replace function public.guard_soft_delete_only () returns trigger language plpgsql as $$
begin
  if (to_jsonb(old) - 'deleted') is distinct from (to_jsonb(new) - 'deleted') then
    raise exception 'This row is immutable except for its deleted flag';
  end if;
  return new;
end;
$$;

alter function public.guard_soft_delete_only () owner to postgres;

create or replace trigger guard_comment_upvote_update
before update on public.comment_upvote for each row
execute function public.guard_soft_delete_only ();

create or replace trigger guard_phrase_playlist_upvote_update
before update on public.phrase_playlist_upvote for each row
execute function public.guard_soft_delete_only ();

create or replace trigger guard_phrase_request_upvote_update
before update on public.phrase_request_upvote for each row
execute function public.guard_soft_delete_only ();

drop function if exists public.guard_upvote_update ();

-- 2. phrase_tag. Anyone signed in can tag a phrase, and the badge's X button
-- was offered to every reader, but only the DELETE policy's admins ever
-- removed one — everyone else's delete matched no row and reported success.
-- The UPDATE policy follows the INSERT policy's ownership rule instead: the
-- person who added the tag can remove it, and so can an admin. The UI hides
-- the X from everyone else.
alter table public.phrase_tag
add column deleted boolean not null default false;

-- The composite primary key goes. Every collection keys on the row's own
-- `id`, and a link table that keys on its own columns cannot hold both a
-- removed row and its replacement. As a partial unique index the constraint
-- still says what it always said — a phrase carries a tag once — while
-- letting the removed rows pile up behind it.
alter table public.phrase_tag
add column id uuid not null default gen_random_uuid();

alter table public.phrase_tag
drop constraint phrase_tag_pkey;

alter table public.phrase_tag
add constraint phrase_tag_pkey primary key (id);

create unique index phrase_tag_phrase_id_tag_id_live_idx on public.phrase_tag using btree (phrase_id, tag_id)
where
	(deleted = false);

-- The dropped composite primary key was also the only index leading with
-- `phrase_id`, which is what Postgres scans when a phrase is removed. The
-- partial index above cannot serve a lookup that says nothing about `deleted`.
create index phrase_tag_phrase_id_idx on public.phrase_tag using btree (phrase_id);

create policy "Taggers and admins can soft-delete phrase tags" on public.phrase_tag
for update
	to authenticated using (
		added_by = (
			select
				auth.uid ()
		)
		or public.is_admin ()
	)
with
	check (
		added_by = (
			select
				auth.uid ()
		)
		or public.is_admin ()
	);

create or replace trigger guard_phrase_tag_update
before update on public.phrase_tag for each row
execute function public.guard_soft_delete_only ();

drop policy if exists "Enable read access for all users" on public.phrase_tag;

create policy "Enable read access for all users" on public.phrase_tag for
select
	using (
		deleted = false
		or added_by = (
			select
				auth.uid ()
		)
		or public.is_admin ()
	);

-- 3. playlist_phrase_link. It already had an owner UPDATE policy for
-- reordering, so the flag needs no new policy and no guard — `order` and
-- `href` are the owner's to change.
alter table public.playlist_phrase_link
add column deleted boolean not null default false;

drop policy if exists "Enable read access for all users" on public.playlist_phrase_link;

create policy "Enable read access for all users" on public.playlist_phrase_link for
select
	using (
		deleted = false
		or uid = (
			select
				auth.uid ()
		)
	);

-- 4. comment_phrase_link. The links on a comment carry the commenter's uid,
-- so the commenter can flag their own.
alter table public.comment_phrase_link
add column deleted boolean not null default false;

create policy "Users can soft-delete phrase links for their own comments" on public.comment_phrase_link
for update
	to authenticated using (
		uid = (
			select
				auth.uid ()
		)
	)
with
	check (
		uid = (
			select
				auth.uid ()
		)
	);

create or replace trigger guard_comment_phrase_link_update
before update on public.comment_phrase_link for each row
execute function public.guard_soft_delete_only ();

drop policy if exists "Enable read access for all users" on public.comment_phrase_link;

create policy "Enable read access for all users" on public.comment_phrase_link for
select
	using (
		deleted = false
		or uid = (
			select
				auth.uid ()
		)
	);

-- 5. message_tag_link. Admin-only, like the rest of the message-tag surface.
alter table public.message_tag_link
add column deleted boolean not null default false;

alter table public.message_tag_link
add column id uuid not null default gen_random_uuid();

alter table public.message_tag_link
drop constraint message_tag_link_pkey;

alter table public.message_tag_link
add constraint message_tag_link_pkey primary key (id);

create unique index message_tag_link_message_id_tag_slug_live_idx on public.message_tag_link using btree (message_id, tag_slug)
where
	(deleted = false);

create index message_tag_link_message_id_idx on public.message_tag_link using btree (message_id);

create policy "Admins can update message tag links" on public.message_tag_link
for update
	to authenticated using (public.is_admin ())
with
	check (public.is_admin ());

create or replace trigger guard_message_tag_link_update
before update on public.message_tag_link for each row
execute function public.guard_soft_delete_only ();

drop policy if exists "Enable read access for all users" on public.message_tag_link;

create policy "Enable read access for all users" on public.message_tag_link for
select
	using (
		deleted = false
		or public.is_admin ()
	);

-- 6. request_comment. Removing a comment is a tombstone, not a hole: the
-- replies people wrote under it stay readable, and the comment keeps its
-- place in the thread as the thing they are replying to.
--
-- So the row stays selectable and the text goes instead. `blank_removed_comment`
-- clears the content in the same statement that sets the flag, which is what
-- makes leaving the SELECT policy open safe — a removed comment carries
-- nothing left to read.
alter table public.request_comment
add column deleted boolean not null default false;

create or replace function public.blank_removed_comment () returns trigger language plpgsql as $$
begin
  new.content = '';
  return new;
end;
$$;

alter function public.blank_removed_comment () owner to postgres;

create or replace trigger blank_removed_comment
before update on public.request_comment for each row when (
	old.deleted = false
	and new.deleted = true
)
execute function public.blank_removed_comment ();

-- The phrase links a removed comment contributed do go with it: they are the
-- commenter's own rows, and a phrase nobody can read the case for should not
-- keep counting as an answer to the request.
create or replace function public.cascade_soft_delete_comment () returns trigger language plpgsql security definer as $$
begin
  update public.comment_phrase_link
  set deleted = true
  where comment_id = new.id and deleted = false;

  return null;
end;
$$;

alter function public.cascade_soft_delete_comment () owner to postgres;

create or replace trigger cascade_soft_delete_comment
after update on public.request_comment for each row when (
	old.deleted = false
	and new.deleted = true
)
execute function public.cascade_soft_delete_comment ();

-- 7. The views and the search triggers. A flagged row is gone as far as
-- every reader is concerned, so each place that reads one of these tables
-- filters the flag, and the two search triggers that fired on insert-or-
-- delete now also fire when the flag moves.
create or replace view public.phrase_meta
with
	(security_invoker = 'true') as
with
	tags as (
		select
			pt.phrase_id as t_phrase_id,
			(
				json_agg(distinct jsonb_build_object('id', tag.id, 'name', tag.name)) filter (
					where
						tag.id is not null
				)
			)::jsonb as tags
		from
			public.phrase_tag pt
			left join public.tag tag on tag.id = pt.tag_id
		where
			pt.deleted = false
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
	phrase.updated_at
from
	public.phrase phrase
	left join public.phrase_stats stats on stats.phrase_id = phrase.id
	left join tags on tags.t_phrase_id = phrase.id;

alter view public.phrase_meta owner to postgres;

create or replace trigger embed_corpus_on_tag_change
after insert or delete or update of deleted on public.phrase_tag for each row
execute function public.trigger_notify_corpus_embed_change ('phrase');

create or replace trigger refresh_text_index_on_tag_change
after insert or delete or update of deleted on public.phrase_tag for each statement
execute function public.trigger_refresh_search_text_index ();

-- `feed_activities` reads both link tables: a playlist's phrase count, and
-- the "orphan phrase" arm, which shows a phrase only when no comment and no
-- playlist already carries it. A flagged link stops carrying it.
create or replace view public.feed_activities as
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
				count(*) as count
			from
				public.playlist_phrase_link
			where
				playlist_phrase_link.playlist_id = pp.id
				and playlist_phrase_link.deleted = false
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
	coalesce(ps.count_learners, (0)::bigint) as popularity,
	jsonb_build_object(
		'text',
		p.text,
		'source',
		case
			when cpl.request_id is not null then jsonb_build_object('type', 'request', 'id', cpl.request_id, 'comment_id', cpl.comment_id)
			when ppl.playlist_id is not null then jsonb_build_object(
				'type',
				'playlist',
				'id',
				ppl.playlist_id,
				'title',
				playlist.title,
				'follows',
				(coalesce(ps.count_learners, (0)::bigint))::integer
			)
			else null::jsonb
		end
	) as payload
from
	public.phrase p
	left join public.phrase_stats ps on ps.phrase_id = p.id
	left join public.comment_phrase_link cpl on p.id = cpl.phrase_id
	and cpl.deleted = false
	left join public.playlist_phrase_link ppl on p.id = ppl.phrase_id
	and ppl.deleted = false
	left join public.phrase_playlist playlist on ppl.playlist_id = playlist.id
where
	p.added_by is not null
	and p.archived = false
	and cpl.id is null
	and ppl.id is null;

alter view public.feed_activities owner to postgres;

-- `search_text_index` folds a phrase's tag names into its searchable text. A
-- materialized view cannot be replaced in place, so it is dropped and rebuilt
-- with its four indexes and its grants.
drop materialized view if exists public.search_text_index;

create materialized view public.search_text_index as
with
	phrase_tags as (
		select
			pt.phrase_id,
			string_agg(t.name, ' '::text) as tag_names
		from
			public.phrase_tag pt
			join public.tag t on t.id = pt.tag_id
		where
			pt.deleted = false
		group by
			pt.phrase_id
	)
select
	'phrase'::text as source_type,
	p.id as source_id,
	p.id as entity_id,
	'phrase'::text as entity_type,
	(p.lang)::text as entity_lang,
	(p.lang)::text as text_lang,
	p.text,
	lower(p.text || coalesce(' '::text || ptags.tag_names, ''::text)) as text_normalized,
	p.created_at as entity_created_at
from
	public.phrase p
	left join phrase_tags ptags on ptags.phrase_id = p.id
where
	p.archived = false
union all
select
	'translation'::text as source_type,
	t.id as source_id,
	t.phrase_id as entity_id,
	'phrase'::text as entity_type,
	(p.lang)::text as entity_lang,
	(t.lang)::text as text_lang,
	t.text,
	lower(t.text) as text_normalized,
	p.created_at as entity_created_at
from
	public.phrase_translation t
	join public.phrase p on p.id = t.phrase_id
where
	t.archived = false
	and p.archived = false
union all
select
	'request'::text as source_type,
	r.id as source_id,
	r.id as entity_id,
	'request'::text as entity_type,
	(r.lang)::text as entity_lang,
	(r.lang)::text as text_lang,
	r.prompt as text,
	lower(r.prompt) as text_normalized,
	r.created_at as entity_created_at
from
	public.phrase_request r
where
	r.deleted = false
union all
select
	'playlist'::text as source_type,
	pl.id as source_id,
	pl.id as entity_id,
	'playlist'::text as entity_type,
	(pl.lang)::text as entity_lang,
	(pl.lang)::text as text_lang,
	case
		when coalesce(pl.description, ''::text) <> ''::text then (pl.title || '
'::text) || pl.description
		else pl.title
	end as text,
	lower(
		case
			when coalesce(pl.description, ''::text) <> ''::text then (pl.title || ' '::text) || pl.description
			else pl.title
		end
	) as text_normalized,
	pl.created_at as entity_created_at
from
	public.phrase_playlist pl
where
	pl.deleted = false
with
	no data;

alter materialized view public.search_text_index owner to postgres;

create index search_text_index_entity_id_idx on public.search_text_index using btree (entity_id);

create index search_text_index_entity_lang_idx on public.search_text_index using btree (entity_lang);

create unique index search_text_index_source_idx on public.search_text_index using btree (source_type, source_id);

create index search_text_index_text_normalized_trgm_idx on public.search_text_index using gin (text_normalized public.gin_trgm_ops);

grant all on table public.search_text_index to anon;

grant all on table public.search_text_index to authenticated;

grant all on table public.search_text_index to service_role;

refresh materialized view public.search_text_index;
