drop function if exists "public"."fulfill_phrase_request" (
	request_id uuid,
	p_phrase_text text,
	p_translation_text text,
	p_translation_lang character varying
);

alter table "public"."phrase_request"
drop column "status";

drop type "public"."phrase_request_status";