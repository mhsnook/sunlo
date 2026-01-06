create type "public"."phrase_request_status" as enum('pending', 'fulfilled', 'cancelled');

alter type "public"."phrase_request_status" owner to "postgres";

create table if not exists "public"."phrase_request" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"requester_uid" "uuid" not null,
	"lang" character varying not null,
	"prompt" "text" not null,
	"status" "public"."phrase_request_status" default 'pending'::"public"."phrase_request_status" not null,
	"fulfilled_at" timestamp with time zone,
	constraint "phrase_request_pkey" primary key ("id"),
	constraint "phrase_request_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on delete cascade,
	constraint "phrase_request_requester_uid_fkey" foreign key ("requester_uid") references "public"."user_profile" ("uid") on delete cascade
);

alter table "public"."phrase_request" owner to "postgres";

alter table "public"."phrase_request" enable row level security;

alter table "public"."phrase"
add column "request_id" uuid null;

alter table "public"."phrase"
add constraint "phrase_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete set null;

create policy "Enable read access for all users" on "public"."phrase_request" for
select
	using (true);

create policy "Users can create their own requests" on "public"."phrase_request" for insert to "authenticated"
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can cancel their own requests" on "public"."phrase_request"
for update
	to "authenticated" using (("requester_uid" = "auth"."uid" ()))
with
	check (("requester_uid" = "auth"."uid" ()));

grant
select
	on table "public"."phrase_request" to "anon";

grant
select
	on table "public"."phrase_request" to "authenticated";

create or replace function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"p_phrase_text" "text",
	"p_translation_text" "text",
	"p_translation_lang" character varying
) returns json language "plpgsql" as $$
DECLARE
    v_requester_uid uuid;
    v_phrase_lang character varying;
    v_request_status public.phrase_request_status;
    fulfiller_uid uuid;
    new_phrase public.phrase;
    new_translation public.phrase_translation;
BEGIN
    -- Get the requester's UID and the phrase language from the request
    SELECT requester_uid, lang, status
    INTO v_requester_uid, v_phrase_lang, v_request_status
    FROM public.phrase_request
    WHERE id = request_id;

    IF v_requester_uid IS NULL THEN
        RAISE EXCEPTION 'Phrase request not found';
    END IF;

    -- Get the UID of the user calling this function, if they are authenticated
    fulfiller_uid := auth.uid();

    -- Insert the new phrase and return the entire row
    INSERT INTO public.phrase (text, lang, added_by, request_id)
    VALUES (p_phrase_text, v_phrase_lang, fulfiller_uid, request_id)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase and return the entire row
    INSERT INTO public.phrase_translation (phrase_id, text, lang, added_by)
    VALUES (new_phrase.id, p_translation_text, p_translation_lang, fulfiller_uid)
    RETURNING * INTO new_translation;

    -- If this is the first phrase for the request, create a card for the requester
    IF v_request_status = 'pending' THEN
        INSERT INTO public.user_card (phrase_id, uid, lang, status)
        VALUES (new_phrase.id, v_requester_uid, v_phrase_lang, 'active');

        -- Update the phrase_request to mark it as fulfilled
        UPDATE public.phrase_request
        SET status = 'fulfilled', fulfilled_at = now()
        WHERE id = request_id;
    END IF;

    -- Return the created phrase and translation as a JSON object
    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation));
END;
$$;
