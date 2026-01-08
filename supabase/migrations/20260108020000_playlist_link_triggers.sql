-- Migration: Add triggers to update playlist timestamp when links are modified
-- This ensures the playlist's updated_at field changes when phrases are added/removed/reordered
-- Function to update parent playlist timestamp
create or replace function public.update_parent_playlist_timestamp () returns trigger language plpgsql security definer as $$
begin
  -- Update the parent playlist's updated_at timestamp
  -- Works for both INSERT/UPDATE (NEW) and DELETE (OLD) operations
  update public.phrase_playlist
  set updated_at = now()
  where id = coalesce(NEW.playlist_id, OLD.playlist_id);

  return coalesce(NEW, OLD);
end;
$$;

-- Trigger on INSERT/DELETE of playlist_phrase_link
-- Fires when phrases are added or removed from a playlist
create trigger on_playlist_phrase_link_changed
after insert
or delete on public.playlist_phrase_link for each row
execute function public.update_parent_playlist_timestamp ();

-- Trigger on UPDATE of playlist_phrase_link
-- Fires when phrase order or href is changed
create trigger on_playlist_phrase_link_updated
after
update on public.playlist_phrase_link for each row
execute function public.update_parent_playlist_timestamp ();
