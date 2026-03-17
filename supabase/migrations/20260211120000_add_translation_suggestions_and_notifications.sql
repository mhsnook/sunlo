-- Translation Suggestions: allow users to suggest corrections/improvements for translations
create table "public"."translation_suggestion" (
	"id" uuid default gen_random_uuid() not null,
	"translation_id" uuid not null,
	"phrase_id" uuid not null,
	"uid" uuid default auth.uid () not null,
	"text" text,
	"comment" text not null,
	"status" text default 'pending' not null,
	"created_at" timestamp with time zone default now() not null,
	"responded_at" timestamp with time zone,
	constraint "translation_suggestion_pkey" primary key ("id"),
	constraint "translation_suggestion_translation_id_fkey" foreign key ("translation_id") references "public"."phrase_translation" ("id") on delete cascade,
	constraint "translation_suggestion_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade,
	constraint "translation_suggestion_uid_fkey" foreign key ("uid") references "auth"."users" ("id"),
	constraint "translation_suggestion_status_check" check (status in ('pending', 'accepted', 'dismissed'))
);

alter table "public"."translation_suggestion" enable row level security;

-- Anyone authenticated can view suggestions
create policy "Authenticated users can view suggestions" on "public"."translation_suggestion" for
select
	to authenticated using (true);

-- Authenticated users can insert suggestions (not on their own translations)
create policy "Authenticated users can suggest corrections" on "public"."translation_suggestion" for insert to authenticated
with
	check (uid = auth.uid ());

-- Translation owners can update suggestion status (accept/dismiss)
create policy "Translation owners can respond to suggestions" on "public"."translation_suggestion"
for update
	to authenticated using (
		exists (
			select
				1
			from
				"public"."phrase_translation"
			where
				"phrase_translation"."id" = "translation_suggestion"."translation_id"
				and "phrase_translation"."added_by" = auth.uid ()
		)
	);

-- Notifications: a general-purpose notification table
create table "public"."notification" (
	"id" uuid default gen_random_uuid() not null,
	"uid" uuid not null,
	"type" text not null,
	"reference_id" uuid not null,
	"is_read" boolean default false not null,
	"created_at" timestamp with time zone default now() not null,
	constraint "notification_pkey" primary key ("id"),
	constraint "notification_uid_fkey" foreign key ("uid") references "auth"."users" ("id")
);

alter table "public"."notification" enable row level security;

-- Users can only see their own notifications
create policy "Users can view own notifications" on "public"."notification" for
select
	to authenticated using (uid = auth.uid ());

-- System inserts notifications (via trigger), users shouldn't insert directly
-- But we need insert for the trigger function running as definer
create policy "System can insert notifications" on "public"."notification" for insert to authenticated
with
	check (true);

-- Users can update their own notifications (mark as read)
create policy "Users can update own notifications" on "public"."notification"
for update
	to authenticated using (uid = auth.uid ());

-- Trigger function: when a translation_suggestion is created, notify the translation owner
create or replace function "public"."notify_translation_owner" () returns trigger language plpgsql security definer as $$
declare
    translation_owner uuid;
begin
    -- Look up the owner of the translation being suggested on
    select added_by into translation_owner
    from "public"."phrase_translation"
    where id = NEW.translation_id;

    -- Only create notification if the owner exists and isn't the suggester
    if translation_owner is not null and translation_owner != NEW.uid then
        insert into "public"."notification" (uid, type, reference_id)
        values (translation_owner, 'translation_suggestion', NEW.id);
    end if;

    return NEW;
end;
$$;

create trigger "trigger_notify_on_translation_suggestion"
after insert on "public"."translation_suggestion" for each row
execute function "public"."notify_translation_owner" ();

-- Enable realtime for notifications
alter publication supabase_realtime
add table "public"."notification";
