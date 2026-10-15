CREATE OR REPLACE FUNCTION public.update_phrase_request_upvote_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
begin
  if (TG_OP = 'INSERT' and NEW.deleted = false) then
    update phrase_request
    set upvote_count = upvote_count + 1
    where id = NEW.request_id;
  elsif (TG_OP = 'UPDATE' and OLD.deleted is distinct from NEW.deleted) then
    update phrase_request
    set upvote_count = upvote_count + (case when NEW.deleted then -1 else 1 end)
    where id = NEW.request_id;
  elsif (TG_OP = 'DELETE' and OLD.deleted = false) then
    update phrase_request
    set upvote_count = upvote_count - 1
    where id = OLD.request_id;
  end if;
  return null;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_upvote_count"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_upvote_count"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_phrase_request_upvote_count"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_request_upvote_count"() TO "postgres";
