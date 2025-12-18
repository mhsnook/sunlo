alter table "public"."phrase"
drop constraint "phrase_request_id_fkey";

drop view if exists "public"."meta_language";

drop view if exists "public"."meta_phrase_request";

drop view if exists "public"."meta_phrase_info";

drop view if exists "public"."user_deck_plus";

create table
	"public"."comment_phrase_link" (
		"id" uuid not null default gen_random_uuid (),
		"request_id" uuid not null,
		"comment_id" uuid not null,
		"phrase_id" uuid not null,
		"uid" uuid not null default auth.uid (),
		"created_at" timestamp with time zone not null default now()
	);

alter table "public"."comment_phrase_link" enable row level security;

create table
	"public"."comment_upvote" (
		"comment_id" uuid not null,
		"uid" uuid not null default auth.uid (),
		"created_at" timestamp with time zone not null default now()
	);

alter table "public"."comment_upvote" enable row level security;

create table
	"public"."request_comment" (
		"id" uuid not null default gen_random_uuid (),
		"request_id" uuid not null,
		"parent_comment_id" uuid,
		"uid" uuid not null default auth.uid (),
		"content" text not null,
		"created_at" timestamp with time zone not null default now(),
		"updated_at" timestamp with time zone not null default now(),
		"upvote_count" integer not null default 0
	);

alter table "public"."request_comment" enable row level security;

-- Migrate existing data --
-- Create comments for existing phrases with request_id
insert into
	"public"."request_comment" (
		request_id,
		parent_comment_id,
		uid,
		content,
		created_at,
		upvote_count
	)
select distinct
	p.request_id,
	null::uuid, -- top-level comment
	p.added_by,
	'', -- empty content
	min(p.created_at), -- use earliest phrase's timestamp
	0 -- initial upvote count
from
	phrase p
where
	p.request_id is not null
group by
	p.request_id,
	p.added_by;

-- Link phrases to their comments via comment_phrase_link
insert into
	comment_phrase_link (request_id, comment_id, phrase_id, created_at)
select
	c.request_id,
	c.id,
	p.id,
	p.created_at
from
	phrase p
	join request_comment c on c.request_id = p.request_id
	and c.uid = p.added_by
where
	p.request_id is not null;

-- Drop the old column and constraint
alter table phrase
drop constraint if exists phrase_request_id_fkey;

alter table "public"."phrase"
drop column if exists "request_id";

create unique index comment_phrase_link_pkey on public.comment_phrase_link using btree (id);

create unique index comment_upvote_pkey on public.comment_upvote using btree (comment_id, uid);

create index idx_comment_created_at on public.request_comment using btree (parent_comment_id, created_at);

create index idx_comment_parent on public.request_comment using btree (parent_comment_id);

create index idx_comment_phrase_link_comment on public.comment_phrase_link using btree (comment_id);

create index idx_comment_phrase_link_phrase on public.comment_phrase_link using btree (phrase_id);

create index idx_comment_phrase_link_request on public.comment_phrase_link using btree (request_id);

create index idx_comment_request_id on public.request_comment using btree (request_id);

create index idx_comment_upvotes on public.request_comment using btree (request_id, upvote_count desc);

create index idx_upvote_comment on public.comment_upvote using btree (comment_id);

create index idx_upvote_user on public.comment_upvote using btree (uid);

create unique index request_comment_pkey on public.request_comment using btree (id);

create unique index unique_user_comment_upvote on public.comment_upvote using btree (comment_id, uid);

alter table "public"."comment_phrase_link"
add constraint "comment_phrase_link_pkey" primary key using index "comment_phrase_link_pkey";

alter table "public"."comment_upvote"
add constraint "comment_upvote_pkey" primary key using index "comment_upvote_pkey";

alter table "public"."request_comment"
add constraint "request_comment_pkey" primary key using index "request_comment_pkey";

alter table "public"."comment_phrase_link"
add constraint "comment_phrase_link_comment_id_fkey" foreign key (comment_id) references public.request_comment (id) on delete cascade not valid;

alter table "public"."comment_phrase_link" validate constraint "comment_phrase_link_comment_id_fkey";

alter table "public"."comment_phrase_link"
add constraint "comment_phrase_link_phrase_id_fkey" foreign key (phrase_id) references public.phrase (id) on delete cascade not valid;

alter table "public"."comment_phrase_link" validate constraint "comment_phrase_link_phrase_id_fkey";

alter table "public"."comment_phrase_link"
add constraint "comment_phrase_link_request_id_fkey" foreign key (request_id) references public.phrase_request (id) on delete cascade not valid;

alter table "public"."comment_phrase_link" validate constraint "comment_phrase_link_request_id_fkey";

alter table "public"."comment_upvote"
add constraint "comment_upvote_comment_id_fkey" foreign key (comment_id) references public.request_comment (id) on delete cascade not valid;

alter table "public"."comment_upvote" validate constraint "comment_upvote_comment_id_fkey";

alter table "public"."comment_upvote"
add constraint "comment_upvote_uid_fkey" foreign key (uid) references public.user_profile (uid) on delete cascade not valid;

alter table "public"."comment_upvote" validate constraint "comment_upvote_uid_fkey";

alter table "public"."comment_upvote"
add constraint "unique_user_comment_upvote" unique using index "unique_user_comment_upvote";

alter table "public"."request_comment"
add constraint "request_comment_parent_comment_id_fkey" foreign key (parent_comment_id) references public.request_comment (id) on delete cascade not valid;

alter table "public"."request_comment" validate constraint "request_comment_parent_comment_id_fkey";

alter table "public"."request_comment"
add constraint "request_comment_request_id_fkey" foreign key (request_id) references public.phrase_request (id) on delete cascade not valid;

alter table "public"."request_comment" validate constraint "request_comment_request_id_fkey";

alter table "public"."request_comment"
add constraint "request_comment_uid_fkey" foreign key (uid) references public.user_profile (uid) on delete cascade not valid;

alter table "public"."request_comment" validate constraint "request_comment_uid_fkey";

set
	check_function_bodies = off;

create
or replace function public.create_comment_with_phrases (
	p_request_id uuid,
	p_content text,
	p_parent_comment_id uuid default null::uuid,
	p_phrase_ids uuid[] default array[]::uuid[]
) returns json language plpgsql as $function$
DECLARE
  v_comment_id uuid;
  v_new_comment request_comment;
  v_phrase_id uuid;
BEGIN
  -- Validate that either content or phrases are provided
  IF (p_content IS NULL OR trim(p_content) = '') AND (p_phrase_ids IS NULL OR array_length(p_phrase_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Comment must have either content or attached phrases';
  END IF;

  -- Insert the comment (works for both top-level and replies)
  INSERT INTO request_comment (request_id, parent_comment_id, content)
  VALUES (p_request_id, p_parent_comment_id, p_content)
  RETURNING * INTO v_new_comment;

  v_comment_id := v_new_comment.id;

  -- Link phrases to comment (max 4)
  IF p_phrase_ids IS NOT NULL AND array_length(p_phrase_ids, 1) > 0 THEN
    IF array_length(p_phrase_ids, 1) > 4 THEN
      RAISE EXCEPTION 'Cannot attach more than 4 phrases to a comment';
    END IF;

    FOREACH v_phrase_id IN ARRAY p_phrase_ids
    LOOP
      INSERT INTO comment_phrase_link (request_id, comment_id, phrase_id)
      VALUES (p_request_id, v_comment_id, v_phrase_id);
    END LOOP;
  END IF;

  -- Return the comment
  RETURN row_to_json(v_new_comment);
END;
$function$;

create
or replace function public.toggle_comment_upvote (p_comment_id uuid) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF v_upvote_exists THEN
    -- Remove upvote
    DELETE FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid;

    RETURN json_build_object(
      'comment_id', p_comment_id,
      'action', 'removed'
    );
  ELSE
    -- Add upvote
    INSERT INTO comment_upvote (comment_id, uid)
    VALUES (p_comment_id, v_user_uid);

    RETURN json_build_object(
      'comment_id', p_comment_id,
      'action', 'added'
    );
  END IF;
END;
$function$;

create
or replace function public.update_comment_upvote_count () returns trigger language plpgsql security definer as $function$
begin
  if (TG_OP = 'INSERT') then
    update request_comment
    set upvote_count = upvote_count + 1
    where id = NEW.comment_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update request_comment
    set upvote_count = upvote_count - 1
    where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$function$;

create or replace view
	"public"."meta_language" as
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
					public.user_deck d
				where
					((l.lang)::text = (d.lang)::text)
			) as learners,
			(
				select
					count(distinct p.id) as count
				from
					public.phrase p
				where
					((l.lang)::text = (p.lang)::text)
			) as phrases_to_learn
		from
			public.language l
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
			(first.learners * first.phrases_to_learn) as display_score
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
			r1.created_at as recentest_review_at,
			r1.updated_at
		from
			(
				public.user_card_review r1
				left join public.user_card_review r2 on (
					(
						(r1.uid = r2.uid)
						and (r1.phrase_id = r2.phrase_id)
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
			r.recentest_review_at
		from
			(
				public.user_card c
				join recent_review r on (
					(
						(c.phrase_id = r.phrase_id)
						and (c.uid = r.uid)
					)
				)
			)
	),
	results as (
		select
			p.id,
			p.created_at,
			p.added_by,
			p.lang,
			p.text,
			avg(c.difficulty) as avg_difficulty,
			jsonb_build_object(
				'uid',
				pp.uid,
				'username',
				pp.username,
				'avatar_path',
				pp.avatar_path
			) as added_by_profile,
			avg(c.stability) as avg_stability,
			count(distinct c.phrase_id) as count_cards,
			sum(
				case
					when (c.status = 'active'::public.card_status) then 1
					else 0
				end
			) as count_active,
			sum(
				case
					when (c.status = 'learned'::public.card_status) then 1
					else 0
				end
			) as count_learned,
			sum(
				case
					when (c.status = 'skipped'::public.card_status) then 1
					else 0
				end
			) as count_skipped,
			json_agg(distinct jsonb_build_object('id', t.id, 'name', t.name)) filter (
				where
					(t.id is not null)
			) as tags
		from
			(
				(
					(
						(
							public.phrase p
							left join card_with_recentest_review c on ((c.phrase_id = p.id))
						)
						left join public.phrase_tag pt on ((pt.phrase_id = p.id))
					)
					left join public.public_profile pp on ((p.added_by = pp.uid))
				)
				left join public.tag t on ((t.id = pt.tag_id))
			)
		group by
			pp.uid,
			pp.username,
			pp.avatar_path,
			p.id,
			p.lang,
			p.text,
			p.created_at,
			p.added_by
	)
select
	results.id,
	results.added_by,
	results.created_at,
	results.lang,
	results.text,
	results.added_by_profile,
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
	) as rank_newest,
	results.tags
from
	results;

create or replace view
	"public"."meta_phrase_request" as
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
	) as profile,
	(
		select
			array_agg(distinct cp.phrase_id) as array_agg
		from
			public.comment_phrase_link cp
		where
			(cp.request_id = pr.id)
	) as phrase_ids
from
	(
		public.phrase_request pr
		left join public.public_profile pp on ((pr.requester_uid = pp.uid))
	);

create or replace view
	"public"."user_deck_plus" as
select
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.daily_review_goal,
	(
		select
			l.name
		from
			public.language l
		where
			((l.lang)::text = (d.lang)::text)
		limit
			1
	) as language,
	d.created_at,
	count(*) filter (
		where
			(c.status = 'learned'::public.card_status)
	) as cards_learned,
	count(*) filter (
		where
			(c.status = 'active'::public.card_status)
	) as cards_active,
	count(*) filter (
		where
			(c.status = 'skipped'::public.card_status)
	) as cards_skipped,
	(
		select
			count(*) as count
		from
			public.phrase p
		where
			((p.lang)::text = (d.lang)::text)
	) as lang_total_phrases,
	(
		select
			max(r.created_at) as max
		from
			public.user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.uid = d.uid)
			)
		limit
			1
	) as most_recent_review_at,
	(
		select
			count(*) as count
		from
			public.user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.uid = d.uid)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) as count_reviews_7d,
	(
		select
			count(*) as count
		from
			public.user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.uid = d.uid)
				and (r.created_at > (now() - '7 days'::interval))
				and (r.score >= 2)
			)
		limit
			1
	) as count_reviews_7d_positive
from
	(
		public.user_deck d
		left join public.user_card c on (
			(
				((d.lang)::text = (c.lang)::text)
				and (d.uid = c.uid)
			)
		)
	)
group by
	d.uid,
	d.lang,
	d.learning_goal,
	d.archived,
	d.daily_review_goal,
	d.created_at
order by
	(
		select
			count(*) as count
		from
			public.user_card_review r
		where
			(
				((r.lang)::text = (d.lang)::text)
				and (r.uid = d.uid)
				and (r.created_at > (now() - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	d.created_at desc;

grant delete on table "public"."comment_phrase_link" to "anon";

grant insert on table "public"."comment_phrase_link" to "anon";

grant references on table "public"."comment_phrase_link" to "anon";

grant
select
	on table "public"."comment_phrase_link" to "anon";

grant trigger on table "public"."comment_phrase_link" to "anon";

grant
truncate on table "public"."comment_phrase_link" to "anon";

grant
update on table "public"."comment_phrase_link" to "anon";

grant delete on table "public"."comment_phrase_link" to "authenticated";

grant insert on table "public"."comment_phrase_link" to "authenticated";

grant references on table "public"."comment_phrase_link" to "authenticated";

grant
select
	on table "public"."comment_phrase_link" to "authenticated";

grant trigger on table "public"."comment_phrase_link" to "authenticated";

grant
truncate on table "public"."comment_phrase_link" to "authenticated";

grant
update on table "public"."comment_phrase_link" to "authenticated";

grant delete on table "public"."comment_phrase_link" to "service_role";

grant insert on table "public"."comment_phrase_link" to "service_role";

grant references on table "public"."comment_phrase_link" to "service_role";

grant
select
	on table "public"."comment_phrase_link" to "service_role";

grant trigger on table "public"."comment_phrase_link" to "service_role";

grant
truncate on table "public"."comment_phrase_link" to "service_role";

grant
update on table "public"."comment_phrase_link" to "service_role";

grant references on table "public"."comment_upvote" to "anon";

grant delete on table "public"."comment_upvote" to "authenticated";

grant insert on table "public"."comment_upvote" to "authenticated";

grant references on table "public"."comment_upvote" to "authenticated";

grant
select
	on table "public"."comment_upvote" to "authenticated";

grant trigger on table "public"."comment_upvote" to "authenticated";

grant
truncate on table "public"."comment_upvote" to "authenticated";

grant
update on table "public"."comment_upvote" to "authenticated";

grant delete on table "public"."comment_upvote" to "service_role";

grant insert on table "public"."comment_upvote" to "service_role";

grant references on table "public"."comment_upvote" to "service_role";

grant
select
	on table "public"."comment_upvote" to "service_role";

grant trigger on table "public"."comment_upvote" to "service_role";

grant
truncate on table "public"."comment_upvote" to "service_role";

grant
update on table "public"."comment_upvote" to "service_role";

grant delete on table "public"."request_comment" to "anon";

grant insert on table "public"."request_comment" to "anon";

grant references on table "public"."request_comment" to "anon";

grant
select
	on table "public"."request_comment" to "anon";

grant trigger on table "public"."request_comment" to "anon";

grant
truncate on table "public"."request_comment" to "anon";

grant
update on table "public"."request_comment" to "anon";

grant delete on table "public"."request_comment" to "authenticated";

grant insert on table "public"."request_comment" to "authenticated";

grant references on table "public"."request_comment" to "authenticated";

grant
select
	on table "public"."request_comment" to "authenticated";

grant trigger on table "public"."request_comment" to "authenticated";

grant
truncate on table "public"."request_comment" to "authenticated";

grant
update on table "public"."request_comment" to "authenticated";

grant delete on table "public"."request_comment" to "service_role";

grant insert on table "public"."request_comment" to "service_role";

grant references on table "public"."request_comment" to "service_role";

grant
select
	on table "public"."request_comment" to "service_role";

grant trigger on table "public"."request_comment" to "service_role";

grant
truncate on table "public"."request_comment" to "service_role";

grant
update on table "public"."request_comment" to "service_role";

create policy "Enable read access for all users" on "public"."comment_phrase_link" as permissive for
select
	to public using (true);

create policy "Users can insert phrase links for their own comments" on "public"."comment_phrase_link" as permissive for insert to authenticated
with
	check (
		(
			(uid = auth.uid ())
			and (
				exists (
					select
						1
					from
						public.request_comment
					where
						(
							(request_comment.id = comment_phrase_link.comment_id)
							and (request_comment.uid = auth.uid ())
						)
				)
			)
		)
	);

create policy "Enable users to view their own data only" on "public"."comment_upvote" as permissive for
select
	to authenticated using (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Users can create upvotes" on "public"."comment_upvote" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can delete own upvotes" on "public"."comment_upvote" as permissive for delete to authenticated using ((uid = auth.uid ()));

create policy "Enable read access for all users" on "public"."request_comment" as permissive for
select
	to public using (true);

create policy "Users can create comments" on "public"."request_comment" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can delete own comments" on "public"."request_comment" as permissive for delete to authenticated using ((uid = auth.uid ()));

create policy "Users can update own comments" on "public"."request_comment" as permissive for
update to authenticated using ((uid = auth.uid ()));

create trigger tr_update_comment_upvote_count
after insert
or delete on public.comment_upvote for each row
execute function public.update_comment_upvote_count ();

drop policy "Allow users to select, insert, update 1oj01fe_0" on "storage"."objects";

drop policy "Allow users to select, insert, update 1oj01fe_1" on "storage"."objects";

drop policy "Allow users to select, insert, update 1oj01fe_2" on "storage"."objects";