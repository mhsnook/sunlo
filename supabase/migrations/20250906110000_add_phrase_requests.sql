create type "public"."phrase_request_status" as enum('pending', 'fulfilled', 'cancelled');

alter type "public"."phrase_request_status" owner to "postgres";

create table if not exists
	"public"."phrase_request" (
		"id" "uuid" default "gen_random_uuid" () not null,
		"created_at" timestamp with time zone default "now" () not null,
		"requester_uid" "uuid" not null,
		"lang" character varying not null,
		"prompt" "text" not null,
		"status" "public"."phrase_request_status" default 'pending'::"public"."phrase_request_status" not null,
		"fulfilled_at" timestamp with time zone,
		"fulfilled_by_uid" "uuid",
		"fulfilled_phrase_id" "uuid",
		constraint "phrase_request_pkey" primary key ("id"),
		constraint "phrase_request_fulfilled_by_uid_fkey" foreign key ("fulfilled_by_uid") references "public"."user_profile" ("uid") on delete set null,
		constraint "phrase_request_fulfilled_phrase_id_fkey" foreign key ("fulfilled_phrase_id") references "public"."phrase" ("id") on delete set null,
		constraint "phrase_request_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on delete cascade,
		constraint "phrase_request_requester_uid_fkey" foreign key ("requester_uid") references "public"."user_profile" ("uid") on delete cascade
	);

alter table "public"."phrase_request" owner to "postgres";

alter table "public"."phrase_request" enable row level security;

create policy "Enable read access for all users" on "public"."phrase_request" for
select
	using (true);

create policy "Users can create their own requests" on "public"."phrase_request" for insert to "authenticated"
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can cancel their own requests" on "public"."phrase_request" for
update to "authenticated" using (("requester_uid" = "auth"."uid" ()))
with
	check (("requester_uid" = "auth"."uid" ()));

grant
select
	on table "public"."phrase_request" to "anon";

grant
select
	on table "public"."phrase_request" to "authenticated";

create
or replace function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"phrase_text" "text",
	"translation_text" "text",
	"translation_lang" character varying
) returns "uuid" language "plpgsql" as $$
DECLARE
    v_requester_uid uuid;
    v_phrase_lang character varying;
    new_phrase_id uuid;
    fulfiller_uid uuid;
BEGIN
    -- Get the requester's UID and the phrase language from the request
    SELECT requester_uid, lang
    INTO v_requester_uid, v_phrase_lang
    FROM public.phrase_request
    WHERE id = request_id AND status = 'pending';

    IF v_requester_uid IS NULL THEN
        RAISE EXCEPTION 'Phrase request not found or already fulfilled';
    END IF;

    -- Get the UID of the user calling this function, if they are authenticated
    fulfiller_uid := auth.uid();

    -- Insert the new phrase
    INSERT INTO public.phrase (text, lang, added_by)
    VALUES (phrase_text, v_phrase_lang, fulfiller_uid)
    RETURNING id INTO new_phrase_id;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, added_by)
    VALUES (new_phrase_id, translation_text, translation_lang, fulfiller_uid);

    -- Insert a new user_card for the requester
    INSERT INTO public.user_card (phrase_id, uid, lang, status)
    VALUES (new_phrase_id, v_requester_uid, v_phrase_lang, 'active');

    -- Update the phrase_request to mark it as fulfilled
    UPDATE public.phrase_request
    SET
        status = 'fulfilled',
        fulfilled_at = now(),
        fulfilled_by_uid = fulfiller_uid,
        fulfilled_phrase_id = new_phrase_id
    WHERE id = request_id;

    RETURN new_phrase_id;
END;
$$;

alter function "public"."fulfill_phrase_request" (
	"request_id" "uuid",
	"phrase_text" "text",
	"translation_text" "text",
	"translation_lang" character varying
) owner to "postgres";

grant
execute on function "public"."fulfill_phrase_request" to "anon";

grant
execute on function "public"."fulfill_phrase_request" to "authenticated";