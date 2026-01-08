set
	check_function_bodies = off;

create or replace function public.fulfill_phrase_request (
	request_id uuid,
	p_phrase_text text,
	p_translation_text text,
	p_translation_lang character varying
) returns json language plpgsql as $function$
DECLARE
    v_requester_uid uuid;
    v_phrase_lang character varying;
    v_request_status public.phrase_request_status;
    fulfiller_uid uuid;
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_card public.user_card;
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

    -- If the requester is also the fulfiller, make them a new card
    IF v_requester_uid = fulfiller_uid THEN
        INSERT INTO public.user_card (phrase_id, uid, lang, status)
        VALUES (new_phrase.id, fulfiller_uid, v_phrase_lang, 'active')
        RETURNING * INTO new_card;

        -- Update the phrase_request to mark it as fulfilled
        UPDATE public.phrase_request
        SET status = 'fulfilled', fulfilled_at = now()
        WHERE id = request_id;
    END IF;

    -- Return the created phrase and translation as a JSON object
    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation), 'card', row_to_json(new_card));
END;
$function$;
