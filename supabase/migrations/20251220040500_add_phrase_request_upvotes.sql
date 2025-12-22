-- Drop view / remove extraneous column
drop view if exists "public"."meta_phrase_request";
alter table "public"."phrase_request" drop column "fulfilled_at";

create table
	"public"."phrase_request_upvote" (
		"request_id" uuid not null,
		"uid" uuid not null default auth.uid (),
		"created_at" timestamp with time zone not null default now()
	);

alter table "public"."phrase_request_upvote" enable row level security;

alter table "public"."phrase_request" add column "upvote_count" integer not null default 0;

-- Trigger to update upvote count
create
or replace function public.update_phrase_request_upvote_count () returns trigger language plpgsql security definer as $function$
begin
  if (TG_OP = 'INSERT') then
    update phrase_request
    set upvote_count = upvote_count + 1
    where id = NEW.request_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update phrase_request
    set upvote_count = upvote_count - 1
    where id = OLD.request_id;
    return OLD;
  end if;
  return null;
end;
$function$;

create trigger on_phrase_request_upvote_added after insert on public.phrase_request_upvote for each row
execute function public.update_phrase_request_upvote_count ();

create trigger on_phrase_request_upvote_removed after delete on public.phrase_request_upvote for each row
execute function public.update_phrase_request_upvote_count ();

-- Toggle function
create
or replace function public.toggle_phrase_request_upvote (p_request_id uuid) returns json language plpgsql as $function$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_request_upvote
    WHERE request_id = p_request_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF v_upvote_exists THEN
    -- Remove upvote
    DELETE FROM phrase_request_upvote
    WHERE request_id = p_request_id AND uid = v_user_uid;

    RETURN json_build_object(
      'request_id', p_request_id,
      'action', 'removed'
    );
  ELSE
    -- Add upvote
    INSERT INTO phrase_request_upvote (request_id, uid)
    VALUES (p_request_id, v_user_uid);

    RETURN json_build_object(
      'request_id', p_request_id,
      'action', 'added'
    );
  END IF;
END;
$function$;

-- Policies
create policy "Enable users to view their own upvotes" on "public"."phrase_request_upvote" as permissive for
select
	to authenticated using (uid = auth.uid ());

create policy "Users can create upvotes" on "public"."phrase_request_upvote" as permissive for insert to authenticated
with
	check ((uid = auth.uid ()));

create policy "Users can delete own upvotes" on "public"."phrase_request_upvote" as permissive for delete to authenticated using ((uid = auth.uid ()));

-- Grants
grant select, insert, delete on table "public"."phrase_request_upvote" to "authenticated";

-- Constraints/Indexes
create unique index phrase_request_upvote_pkey on public.phrase_request_upvote using btree (request_id, uid);
alter table "public"."phrase_request_upvote" add constraint "phrase_request_upvote_pkey" primary key using index "phrase_request_upvote_pkey";
alter table "public"."phrase_request_upvote" add constraint "phrase_request_upvote_request_id_fkey" foreign key (request_id) references public.phrase_request (id) on delete cascade;
alter table "public"."phrase_request_upvote" add constraint "phrase_request_upvote_uid_fkey" foreign key (uid) references public.user_profile (uid) on delete cascade;
