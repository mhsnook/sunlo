-- Migration: Add support for editing and soft-deleting translations
-- Feature W: Edit or soft-delete your own translations
-- 1. Add archived column to phrase_translation table
alter table "public"."phrase_translation"
add column if not exists "archived" boolean not null default false;

-- 2. Add updated_at column for tracking edits
alter table "public"."phrase_translation"
add column if not exists "updated_at" timestamp with time zone default now();

-- 3. Add UPDATE policy allowing users to edit their own translations
-- Users can update the text and archived fields of their own translations
create policy "Users can update their own translations" on "public"."phrase_translation" as permissive
for update
	to authenticated using (
		added_by = (
			select
				auth.uid ()
		)
	)
with
	check (
		added_by = (
			select
				auth.uid ()
		)
	);

-- 4. Update the SELECT policy to filter out archived translations (except for owner)
-- First drop the existing policy
drop policy if exists "Enable read access for all users" on "public"."phrase_translation";

-- Then create a new one that excludes archived translations unless you're the owner
create policy "Enable read access for all users" on "public"."phrase_translation" as permissive for
select
	to public using (
		archived = false
		or added_by = (
			select
				auth.uid ()
		)
	);

-- 5. Create a trigger to update the updated_at timestamp
create or replace function update_phrase_translation_updated_at () returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_phrase_translation_updated_at on "public"."phrase_translation";

create trigger trigger_update_phrase_translation_updated_at before
update on "public"."phrase_translation" for each row
execute function update_phrase_translation_updated_at ();
