-- ============================================================
-- Phrase Comments: threaded discussion on phrases,
-- where people can attach translations as structured responses.
-- Mirrors the request_comment system.
-- ============================================================
----------------------------------------------------------------------
-- Table: phrase_comment
----------------------------------------------------------------------
create table public.phrase_comment (
	id uuid not null default gen_random_uuid() primary key,
	phrase_id uuid not null references public.phrase (id) on delete cascade,
	parent_comment_id uuid references public.phrase_comment (id) on delete cascade,
	uid uuid not null default auth.uid () references public.user_profile (uid) on delete cascade,
	content text not null,
	created_at timestamp with time zone not null default now(),
	updated_at timestamp with time zone default now(),
	upvote_count integer not null default 0
);

alter table public.phrase_comment enable row level security;

create policy "Enable read access for all users" on public.phrase_comment as permissive for
select
	to public using (true);

create policy "Users can create comments" on public.phrase_comment as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can update own comments" on public.phrase_comment
for update
	to authenticated using ((uid = auth.uid ()));

create policy "Users can delete own comments" on public.phrase_comment as permissive for delete to authenticated using ((uid = auth.uid ()));

grant
select
,
	insert,
update,
delete on table public.phrase_comment to authenticated;

grant
select
	on table public.phrase_comment to anon;

----------------------------------------------------------------------
-- Table: comment_translation_link
----------------------------------------------------------------------
create table public.comment_translation_link (
	id uuid not null default gen_random_uuid() primary key,
	phrase_id uuid not null references public.phrase (id) on delete cascade,
	comment_id uuid not null references public.phrase_comment (id) on delete cascade,
	translation_id uuid not null references public.phrase_translation (id) on delete cascade,
	uid uuid not null default auth.uid () references public.user_profile (uid) on delete cascade,
	created_at timestamp with time zone not null default now()
);

alter table public.comment_translation_link enable row level security;

create policy "Enable read access for all users" on public.comment_translation_link as permissive for
select
	to public using (true);

create policy "Users can insert translation links for their own comments" on public.comment_translation_link as permissive for insert to authenticated
with
	check (
		(
			(uid = auth.uid ())
			and (
				exists (
					select
						1
					from
						public.phrase_comment
					where
						(
							(phrase_comment.id = comment_translation_link.comment_id)
							and (phrase_comment.uid = auth.uid ())
						)
				)
			)
		)
	);

grant
select
,
	insert on table public.comment_translation_link to authenticated;

grant
select
	on table public.comment_translation_link to anon;

----------------------------------------------------------------------
-- Table: phrase_comment_upvote
----------------------------------------------------------------------
create table public.phrase_comment_upvote (
	comment_id uuid not null references public.phrase_comment (id) on delete cascade,
	uid uuid not null default auth.uid () references public.user_profile (uid) on delete cascade,
	created_at timestamp with time zone not null default now(),
	primary key (comment_id, uid)
);

create unique index unique_user_phrase_comment_upvote on public.phrase_comment_upvote using btree (comment_id, uid);

alter table public.phrase_comment_upvote enable row level security;

create policy "Enable users to view their own data only" on public.phrase_comment_upvote as permissive for
select
	to authenticated using ((uid = auth.uid ()));

create policy "Users can create upvotes" on public.phrase_comment_upvote as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can delete own upvotes" on public.phrase_comment_upvote as permissive for delete to authenticated using ((uid = auth.uid ()));

grant
select
,
	insert,
	delete on table public.phrase_comment_upvote to authenticated;

----------------------------------------------------------------------
-- Trigger: update phrase_comment.upvote_count on upvote insert/delete
----------------------------------------------------------------------
create or replace function public.update_phrase_comment_upvote_count () returns trigger language plpgsql security definer as $function$
begin
  if (TG_OP = 'INSERT') then
    update phrase_comment
    set upvote_count = upvote_count + 1
    where id = NEW.comment_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update phrase_comment
    set upvote_count = upvote_count - 1
    where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$function$;

create trigger tr_update_phrase_comment_upvote_count
after insert
or delete on public.phrase_comment_upvote for each row
execute function public.update_phrase_comment_upvote_count ();

----------------------------------------------------------------------
-- RPC: create_phrase_comment
-- Creates a comment on a phrase, optionally with translations attached.
-- p_translations is a jsonb array of {lang, text, literal?} objects.
----------------------------------------------------------------------
create or replace function public.create_phrase_comment (
	p_phrase_id uuid,
	p_content text,
	p_parent_comment_id uuid default null::uuid,
	p_translations jsonb default '[]'::jsonb
) returns json language plpgsql as $function$
DECLARE
  v_comment_id uuid;
  v_new_comment phrase_comment;
  v_translation_item jsonb;
  v_new_translation phrase_translation;
  v_link_record comment_translation_link;
  v_links comment_translation_link[];
BEGIN
  -- Validate that either content or translations are provided
  IF (p_content IS NULL OR trim(p_content) = '') AND (p_translations IS NULL OR jsonb_array_length(p_translations) = 0) THEN
    RAISE EXCEPTION 'Comment must have either content or attached translations';
  END IF;

  -- Insert the comment
  INSERT INTO phrase_comment (phrase_id, parent_comment_id, content)
  VALUES (p_phrase_id, p_parent_comment_id, p_content)
  RETURNING * INTO v_new_comment;

  v_comment_id := v_new_comment.id;

  -- Auto-upvote by creator
  INSERT INTO phrase_comment_upvote (comment_id, uid)
  VALUES (v_comment_id, auth.uid())
  ON CONFLICT DO NOTHING;

  -- Re-read to get updated upvote_count after trigger fires
  SELECT * INTO v_new_comment FROM phrase_comment WHERE id = v_comment_id;

  -- Create translation and link it (max 1 per comment)
  IF p_translations IS NOT NULL AND jsonb_array_length(p_translations) > 0 THEN
    IF jsonb_array_length(p_translations) > 1 THEN
      RAISE EXCEPTION 'Cannot attach more than 1 translation to a comment';
    END IF;

    v_translation_item := p_translations->0;

    -- Insert the translation into phrase_translation
    INSERT INTO phrase_translation (phrase_id, lang, text, literal, added_by)
    VALUES (
      p_phrase_id,
      v_translation_item->>'lang',
      v_translation_item->>'text',
      v_translation_item->>'literal',
      auth.uid()
    )
    RETURNING * INTO v_new_translation;

    -- Link the translation to the comment
    INSERT INTO comment_translation_link (phrase_id, comment_id, translation_id)
    VALUES (p_phrase_id, v_comment_id, v_new_translation.id)
    RETURNING * INTO v_link_record;

    v_links := array_append(v_links, v_link_record);
  END IF;

  -- Return the comment and links
  RETURN json_build_object(
    'phrase_comment', row_to_json(v_new_comment),
    'comment_translation_links', (
      SELECT coalesce(json_agg(l), '[]'::json)
      FROM unnest(v_links) AS l
    ),
    'translations', (
      SELECT coalesce(json_agg(t), '[]'::json)
      FROM phrase_translation t
      WHERE t.id IN (
        SELECT ctl.translation_id
        FROM comment_translation_link ctl
        WHERE ctl.comment_id = v_comment_id
      )
    )
  );
END;
$function$;

grant
execute on function public.create_phrase_comment (uuid, text, uuid, jsonb) to authenticated;

----------------------------------------------------------------------
-- RPC: set_phrase_comment_upvote
----------------------------------------------------------------------
create or replace function public.set_phrase_comment_upvote (
	p_comment_id uuid,
	p_action text -- 'add' or 'remove'
) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      INSERT INTO phrase_comment_upvote (comment_id, uid)
      VALUES (p_comment_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      DELETE FROM phrase_comment_upvote
      WHERE comment_id = p_comment_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'comment_id', p_comment_id,
    'action', v_actual_action
  );
END;
$function$;

grant
execute on function public.set_phrase_comment_upvote (uuid, text) to authenticated;

----------------------------------------------------------------------
-- Notification: add new types for phrase comments
----------------------------------------------------------------------
alter type notification_type
add value 'phrase_commented';

alter type notification_type
add value 'phrase_comment_replied';

-- Add phrase_comment_id column to notification table
alter table notification
add column phrase_comment_id uuid references public.phrase_comment (id) on delete cascade;

----------------------------------------------------------------------
-- Trigger: phrase_comment INSERT -> phrase_commented + phrase_comment_replied
----------------------------------------------------------------------
create or replace function notify_on_phrase_comment () returns trigger language plpgsql security definer as $$
declare
  v_phrase_owner uuid;
  v_parent_uid uuid;
begin
  -- Notify phrase owner
  select added_by into v_phrase_owner
    from phrase where id = NEW.phrase_id;

  if v_phrase_owner is not null and v_phrase_owner <> NEW.uid then
    insert into notification (uid, type, actor_uid, phrase_id, phrase_comment_id)
    values (v_phrase_owner, 'phrase_commented', NEW.uid, NEW.phrase_id, NEW.id);
  end if;

  -- Notify parent comment author (if this is a reply)
  if NEW.parent_comment_id is not null then
    select uid into v_parent_uid
      from phrase_comment where id = NEW.parent_comment_id;

    -- Skip if parent author is same as phrase owner (already notified above)
    -- or same as comment author (self-reply)
    if v_parent_uid is not null
       and v_parent_uid <> NEW.uid
       and v_parent_uid is distinct from v_phrase_owner then
      insert into notification (uid, type, actor_uid, phrase_id, phrase_comment_id)
      values (v_parent_uid, 'phrase_comment_replied', NEW.uid, NEW.phrase_id, NEW.id);
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_notify_on_phrase_comment
after insert on phrase_comment for each row
execute function notify_on_phrase_comment ();
