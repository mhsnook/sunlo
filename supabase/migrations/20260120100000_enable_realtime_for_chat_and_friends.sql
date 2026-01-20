-- Enable realtime for chat_message and friend_request_action tables
-- This allows clients to subscribe to INSERT/UPDATE/DELETE events via Supabase Realtime

-- Use a DO block to make this idempotent (won't fail if tables already in publication)
do $$
begin
  -- Add chat_message to the realtime publication if not already present
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'chat_message'
  ) then
    alter publication "supabase_realtime" add table only "public"."chat_message";
  end if;

  -- Add friend_request_action to the realtime publication if not already present
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
    and schemaname = 'public'
    and tablename = 'friend_request_action'
  ) then
    alter publication "supabase_realtime" add table only "public"."friend_request_action";
  end if;
end $$;
