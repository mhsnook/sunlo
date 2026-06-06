-- Drop the phrase-creation RPCs in favor of direct collection actions.
--
-- All three RPCs (`add_phrase_translation_card`, `add_tags_to_phrase`,
-- `bulk_add_phrases`) did multi-row inserts whose shape is fully
-- predictable client-side: every row's ID, FK values, and timestamps can
-- be computed in the browser before the call goes out. Now that
-- `phraseTranslationsCollection` and `phraseTagLinksCollection` exist as
-- flat collections, the client can drive the same flows via
-- `createOptimisticAction` (multi-collection optimistic state +
-- sequential supabase inserts) — no server-side wrapping needed.
--
-- The two composite types only existed to shape input to
-- `bulk_add_phrases`, so they go away with it.
drop function if exists public.add_phrase_translation_card (
	phrase_text text,
	phrase_lang text,
	translation_text text,
	translation_lang text,
	phrase_text_script text,
	translation_text_script text,
	create_card boolean,
	phrase_only_reverse boolean
);

drop function if exists public.add_tags_to_phrase (p_phrase_id uuid, p_lang character varying, p_tags text[]);

drop function if exists public.bulk_add_phrases (p_lang character, p_phrases public.phrase_with_translations_input[], p_user_id uuid);

drop type if exists public.phrase_with_translations_input;

drop type if exists public.translation_input;
