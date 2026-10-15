CREATE OR REPLACE FUNCTION public.trigger_notify_corpus_embed_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
declare
	source_type_arg text := tg_argv[0];
	affected_id uuid;
	project_url text;
	headers_raw text;
	auth_header text;
begin
	headers_raw := current_setting('request.headers', true);
	if headers_raw is null
		or (headers_raw::json->>'authorization') is null
	then
		-- No PostgREST session = direct DB edit (Studio admin, psql).
		-- Skip the dispatch; the next app-driven edit or backfill run
		-- will re-sync.
		return null;
	end if;
	auth_header := headers_raw::json->>'authorization';

	-- For phrase_tag rows, the entity that needs re-embedding is the
	-- parent phrase. Other tables: the row itself.
	if tg_table_name = 'phrase_tag' then
		affected_id := coalesce((new).phrase_id, (old).phrase_id);
	else
		affected_id := coalesce((new).id, (old).id);
	end if;

	select decrypted_secret into project_url
	from vault.decrypted_secrets
	where name = 'project_url';

	perform net.http_post(
		url := project_url || '/functions/v1/embed-corpus-row',
		headers := jsonb_build_object(
			'Content-Type', 'application/json',
			'Authorization', auth_header
		),
		body := jsonb_build_object(
			'source_type', source_type_arg,
			'source_id', affected_id
		)
	);
	return null;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trigger_notify_corpus_embed_change"() TO PUBLIC, "anon", "authenticated";

GRANT EXECUTE ON FUNCTION "public"."trigger_notify_corpus_embed_change"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."trigger_notify_corpus_embed_change"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."trigger_notify_corpus_embed_change"() TO "postgres";
