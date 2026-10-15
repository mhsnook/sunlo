CREATE OR REPLACE FUNCTION public.update_parent_playlist_timestamp()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  -- Update the parent playlist's updated_at timestamp
  -- Works for both INSERT/UPDATE (NEW) and DELETE (OLD) operations
  update public.phrase_playlist
  set updated_at = now()
  where id = coalesce(NEW.playlist_id, OLD.playlist_id);

  return coalesce(NEW, OLD);
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_parent_playlist_timestamp"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_parent_playlist_timestamp"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_parent_playlist_timestamp"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_parent_playlist_timestamp"() TO "postgres";
