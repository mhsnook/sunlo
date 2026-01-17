-- Fix RLS INSERT policies to ensure users can only insert records with their own user ID
-- This prevents authenticated users from inserting records belonging to other users
-- See: https://github.com/mhsnook/sunlo/issues/89

-- 1. Fix phrase table: validate added_by = auth.uid()
drop policy if exists "Anyone can add cards" on "public"."phrase";
create policy "Authenticated users can add phrases"
on "public"."phrase"
for insert
to authenticated
with check ((select auth.uid()) = added_by);

-- 2. Fix phrase_relation table: validate added_by = auth.uid()
drop policy if exists "Logged in users can add see_also's" on "public"."phrase_relation";
create policy "Authenticated users can add phrase relations"
on "public"."phrase_relation"
for insert
to authenticated
with check ((select auth.uid()) = added_by);

-- 3. Fix phrase_translation table: validate added_by = auth.uid()
drop policy if exists "Logged in users can add translations" on "public"."phrase_translation";
create policy "Authenticated users can add translations"
on "public"."phrase_translation"
for insert
to authenticated
with check ((select auth.uid()) = added_by);

-- 4. Fix user_client_event table: validate uid matches auth.uid() or is null for anon users
drop policy if exists "Enable insert for any user" on "public"."user_client_event";
create policy "Users can log their own events"
on "public"."user_client_event"
for insert
to authenticated, anon
with check (uid is null or uid = auth.uid());

-- 5. Fix tag table: validate added_by = auth.uid()
drop policy if exists "Users can insert tags" on "public"."tag";
create policy "Authenticated users can create tags"
on "public"."tag"
for insert
to authenticated
with check ((select auth.uid()) = added_by);

-- 6. Fix phrase_tag table: validate added_by = auth.uid()
drop policy if exists "Users can link tags to phrases" on "public"."phrase_tag";
create policy "Authenticated users can link tags to phrases"
on "public"."phrase_tag"
for insert
to authenticated
with check ((select auth.uid()) = added_by);

-- NOTE: Storage policy for avatars currently allows any authenticated user to upload
-- to any path within the 'avatars' bucket. To properly secure this, the client code
-- would need to be updated to use user-prefixed paths (e.g., {user_id}/avatar.jpg).
-- This is tracked as a future enhancement - leaving existing policies unchanged.
