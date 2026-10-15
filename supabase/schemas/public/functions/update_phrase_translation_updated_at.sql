CREATE OR REPLACE FUNCTION public.update_phrase_translation_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_phrase_translation_updated_at"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_translation_updated_at"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."update_phrase_translation_updated_at"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."update_phrase_translation_updated_at"() TO "postgres";
