CREATE OR REPLACE FUNCTION public.skip_stale_corpus_upsert()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
begin
	if tg_op = 'UPDATE' and new.vectorized_at < old.vectorized_at then
		return null;
	end if;
	return new;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."skip_stale_corpus_upsert"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."skip_stale_corpus_upsert"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."skip_stale_corpus_upsert"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."skip_stale_corpus_upsert"() TO "postgres";
