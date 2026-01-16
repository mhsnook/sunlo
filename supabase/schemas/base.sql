set
	statement_timeout = 0;

set
	lock_timeout = 0;

set
	idle_in_transaction_session_timeout = 0;

set
	client_encoding = 'UTF8';

set
	standard_conforming_strings = on;

select
	pg_catalog.set_config ('search_path', '', false);

set
	check_function_bodies = false;

set
	xmloption = content;

set
	client_min_messages = warning;

set
	row_security = off;

create extension if not exists "pg_net"
with
	schema "extensions";

alter schema "public" owner to "postgres";

create extension if not exists "pg_graphql"
with
	schema "graphql";

create extension if not exists "pg_stat_statements"
with
	schema "extensions";

create extension if not exists "pgcrypto"
with
	schema "extensions";

create extension if not exists "pgjwt"
with
	schema "extensions";

create extension if not exists "supabase_vault"
with
	schema "vault";

create extension if not exists "uuid-ossp"
with
	schema "extensions";

create type "public"."card_status" as enum('active', 'learned', 'skipped');

alter type "public"."card_status" owner to "postgres";

comment on type "public"."card_status" is 'card status is either active, learned or skipped';

create type "public"."chat_message_type" as enum('recommendation', 'accepted', 'request');

alter type "public"."chat_message_type" owner to "postgres";

create type "public"."friend_request_response" as enum('accept', 'decline', 'cancel', 'remove', 'invite');

alter type "public"."friend_request_response" owner to "postgres";

create type "public"."language_proficiency" as enum('fluent', 'proficient', 'beginner');

alter type "public"."language_proficiency" owner to "postgres";

create type "public"."learning_goal" as enum('moving', 'family', 'visiting');

alter type "public"."learning_goal" owner to "postgres";

comment on type "public"."learning_goal" is 'why are you learning this language?';

create type "public"."translation_input" as ("lang" character(3), "text" "text");

alter type "public"."translation_input" owner to "postgres";

create type "public"."phrase_with_translations_input" as (
	"phrase_text" "text",
	"translations" "public"."translation_input" []
);

alter type "public"."phrase_with_translations_input" owner to "postgres";

create or replace function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text" default null::"text",
	"translation_text_script" "text" default null::"text",
	"create_card" boolean default true
) returns "json" language "plpgsql" as $$
DECLARE
    new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_card public.user_card;

BEGIN
    -- Insert a new phrase and get the id
    INSERT INTO public.phrase (text, lang, text_script)
    VALUES (phrase_text, phrase_lang, phrase_text_script)
    RETURNING * INTO new_phrase;

    -- Insert the translation for the new phrase
    INSERT INTO public.phrase_translation (phrase_id, text, lang, text_script)
    VALUES (new_phrase.id, translation_text, translation_lang, translation_text_script)
    RETURNING * INTO new_translation;

    -- Only insert a new user card if create_card is true
    IF create_card THEN
        INSERT INTO public.user_card (phrase_id, status, lang)
        VALUES (new_phrase.id, 'active', phrase_lang)
        RETURNING * INTO new_card;
    END IF;

    RETURN json_build_object('phrase', row_to_json(new_phrase), 'translation', row_to_json(new_translation), 'card', row_to_json(new_card));
END;
$$;

alter function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text",
	"create_card" boolean
) owner to "postgres";

create or replace function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) returns "jsonb" language "plpgsql" as $$
DECLARE
    tag_name text;
    v_tag_id uuid;
    new_tag_record public.tag;
    new_phrase_tag_record public.phrase_tag;
    created_tags jsonb[] := '{}';
    created_phrase_tags jsonb[] := '{}';
BEGIN
    FOREACH tag_name IN ARRAY p_tags
    LOOP
        -- Upsert tag and get its ID.
        WITH new_tag AS (
            INSERT INTO public.tag (name, lang, added_by)
            VALUES (tag_name, p_lang, auth.uid())
            ON CONFLICT (name, lang) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_tag_record FROM new_tag; -- Only populated if a new tag was created

        -- If a new tag was created, add it to our array and get its ID.
        IF new_tag_record.id IS NOT NULL THEN
            v_tag_id := new_tag_record.id;
            created_tags := array_append(created_tags, to_jsonb(new_tag_record));
        ELSE
            -- If the insert did nothing (because the tag already existed), select the existing tag's ID.
            SELECT id INTO v_tag_id FROM public.tag WHERE name = tag_name AND lang = p_lang;
        END IF;

        -- Associate tag with phrase
        WITH new_pt AS (
            INSERT INTO public.phrase_tag (phrase_id, tag_id, added_by)
            VALUES (p_phrase_id, v_tag_id, auth.uid())
            ON CONFLICT (phrase_id, tag_id) DO NOTHING
            RETURNING *
        )
        SELECT * INTO new_phrase_tag_record FROM new_pt; -- Only populated if a new association was created

        IF new_phrase_tag_record.phrase_id IS NOT NULL THEN
            created_phrase_tags := array_append(created_phrase_tags, to_jsonb(new_phrase_tag_record));
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'tags', created_tags,
        'phrase_tags', created_phrase_tags
    );
END;
$$;

alter function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) owner to "postgres";

create or replace function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") returns boolean language "sql" security definer as $$
  SELECT EXISTS (
    SELECT 1
    FROM public.friend_summary
    WHERE
      status = 'friends' AND
      (
        (uid_less = uid1 AND uid_more = uid2) OR
        (uid_less = uid2 AND uid_more = uid1)
      )
  );
$$;

alter function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") owner to "postgres";

create or replace function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" [],
	"p_user_id" "uuid"
) returns "jsonb" language "plpgsql" as $$
declare
    phrase_item public.phrase_with_translations_input;
	 new_phrase public.phrase;
    new_translation public.phrase_translation;
    new_phrases public.phrase[] := '{}';
    new_translations public.phrase_translation[] := '{}';
begin
    foreach phrase_item in array p_phrases
    loop
        -- Insert the phrase and get the whole new record.
        insert into public.phrase (lang, text, added_by)
        values (p_lang, phrase_item.phrase_text, p_user_id)
        returning * into new_phrase;

        new_phrases := array_append(new_phrases, new_phrase);

        -- Insert all translations for the new phrase
        if array_length(phrase_item.translations, 1) > 0 then
            for i in 1..array_length(phrase_item.translations, 1)
            loop
                insert into public.phrase_translation (phrase_id, lang, text)
                values (new_phrase.id, (phrase_item.translations[i]).lang, (phrase_item.translations[i]).text)
                returning * into new_translation;

                new_translations := array_append(new_translations, new_translation);
            end loop;
        end if;

    end loop;
    return jsonb_build_object(
      'phrases', to_jsonb(new_phrases),
      'translations', to_jsonb(new_translations)
    );
end;
$$;

alter function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" [],
	"p_user_id" "uuid"
) owner to "postgres";

create or replace function "public"."create_comment_with_phrases" (
	"p_request_id" "uuid",
	"p_content" "text",
	"p_parent_comment_id" "uuid" default null::"uuid",
	"p_phrase_ids" "uuid" [] default array[]::"uuid" []
) returns "json" language "plpgsql" as $$
DECLARE
  v_comment_id uuid;
  v_new_comment request_comment;
BEGIN
  -- Validate that either content or phrases are provided
  IF (p_content IS NULL OR trim(p_content) = '') AND (p_phrase_ids IS NULL OR array_length(p_phrase_ids, 1) IS NULL) THEN
    RAISE EXCEPTION 'Comment must have either content or attached phrases';
  END IF;

  -- Insert the comment (works for both top-level and replies)
  INSERT INTO request_comment (request_id, parent_comment_id, content)
  VALUES (p_request_id, p_parent_comment_id, p_content)
  RETURNING * INTO v_new_comment;

  v_comment_id := v_new_comment.id;

  -- Link phrases to comment (max 4)
  IF p_phrase_ids IS NOT NULL AND array_length(p_phrase_ids, 1) > 0 THEN
    IF array_length(p_phrase_ids, 1) > 4 THEN
      RAISE EXCEPTION 'Cannot attach more than 4 phrases to a comment';
    END IF;

    INSERT INTO comment_phrase_link (request_id, comment_id, phrase_id)
    SELECT p_request_id, v_comment_id, unnest(p_phrase_ids);
  END IF;

  -- Return the comment and links
  RETURN json_build_object(
    'request_comment', row_to_json(v_new_comment),
    'comment_phrase_links', (
      SELECT coalesce(json_agg(l), '[]'::json)
      FROM comment_phrase_link l
      WHERE l.comment_id = v_comment_id
    )
  );
END;
$$;

alter function "public"."create_comment_with_phrases" (
	"p_request_id" "uuid",
	"p_content" "text",
	"p_parent_comment_id" "uuid",
	"p_phrase_ids" "uuid" []
) owner to "postgres";

create or replace function "public"."create_playlist_with_links" (
	"lang" "text",
	"title" "text",
	"description" "text" default null::"text",
	"href" "text" default null::"text",
	"phrases" "jsonb" default '[]'::"jsonb"
) returns "json" language "plpgsql" as $$
DECLARE
  v_playlist_id uuid;
  v_new_playlist phrase_playlist;
  v_phrase_item jsonb;
  v_link_record playlist_phrase_link;
  v_links playlist_phrase_link[] := '{}';
BEGIN
  -- Insert the playlist
  INSERT INTO phrase_playlist (title, description, href, lang)
  VALUES (title, description, href, lang)
  RETURNING * INTO v_new_playlist;

  v_playlist_id := v_new_playlist.id;

  -- Insert phrase links
  IF phrases IS NOT NULL AND jsonb_array_length(phrases) > 0 THEN
    FOR v_phrase_item IN SELECT * FROM jsonb_array_elements(phrases)
    LOOP
      INSERT INTO playlist_phrase_link (
        playlist_id,
        phrase_id,
        href,
        "order"
      ) VALUES (
        v_playlist_id,
        (v_phrase_item->>'phrase_id')::uuid,
        v_phrase_item->>'href',
        (v_phrase_item->>'order')::double precision
      )
      RETURNING * INTO v_link_record;

      v_links := array_append(v_links, v_link_record);
    END LOOP;
  END IF;

  -- Return the playlist and links
  RETURN json_build_object(
    'playlist', row_to_json(v_new_playlist),
    'links', (
      SELECT coalesce(json_agg(l), '[]'::json)
      FROM unnest(v_links) AS l
    )
  );
END;
$$;

alter function "public"."create_playlist_with_links" (
	"lang" "text",
	"title" "text",
	"description" "text",
	"href" "text",
	"phrases" "jsonb"
) owner to "postgres";

create or replace function "public"."set_comment_upvote" ("p_comment_id" "uuid", "p_action" "text") returns "json" language "plpgsql" as $$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM comment_upvote
    WHERE comment_id = p_comment_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO comment_upvote (comment_id, uid)
      VALUES (p_comment_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM comment_upvote
      WHERE comment_id = p_comment_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'comment_id', p_comment_id,
    'action', v_actual_action
  );
END;
$$;

alter function "public"."set_comment_upvote" ("p_comment_id" "uuid", "p_action" "text") owner to "postgres";

create or replace function "public"."set_phrase_playlist_upvote" ("p_playlist_id" "uuid", "p_action" "text") returns "json" language "plpgsql" as $$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_playlist_upvote
    WHERE playlist_id = p_playlist_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO phrase_playlist_upvote (playlist_id, uid)
      VALUES (p_playlist_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM phrase_playlist_upvote
      WHERE playlist_id = p_playlist_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'playlist_id', p_playlist_id,
    'action', v_actual_action
  );
END;
$$;

alter function "public"."set_phrase_playlist_upvote" ("p_playlist_id" "uuid", "p_action" "text") owner to "postgres";

create or replace function "public"."set_phrase_request_upvote" ("p_request_id" "uuid", "p_action" "text") returns "json" language "plpgsql" as $$
DECLARE
  v_user_uid uuid := auth.uid();
  v_upvote_exists boolean;
  v_actual_action text;
BEGIN
  -- Check if upvote exists
  SELECT EXISTS(
    SELECT 1 FROM phrase_request_upvote
    WHERE request_id = p_request_id AND uid = v_user_uid
  ) INTO v_upvote_exists;

  IF p_action = 'add' THEN
    IF NOT v_upvote_exists THEN
      -- Add upvote
      INSERT INTO phrase_request_upvote (request_id, uid)
      VALUES (p_request_id, v_user_uid);
      v_actual_action := 'added';
    ELSE
      -- Already exists, no change
      v_actual_action := 'no_change';
    END IF;
  ELSIF p_action = 'remove' THEN
    IF v_upvote_exists THEN
      -- Remove upvote
      DELETE FROM phrase_request_upvote
      WHERE request_id = p_request_id AND uid = v_user_uid;
      v_actual_action := 'removed';
    ELSE
      -- Doesn't exist, no change
      v_actual_action := 'no_change';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid action: %. Must be "add" or "remove"', p_action;
  END IF;

  RETURN json_build_object(
    'request_id', p_request_id,
    'action', v_actual_action
  );
END;
$$;

alter function "public"."set_phrase_request_upvote" ("p_request_id" "uuid", "p_action" "text") owner to "postgres";

create or replace function "public"."update_comment_upvote_count" () returns "trigger" language "plpgsql" security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update request_comment
    set upvote_count = upvote_count + 1
    where id = NEW.comment_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update request_comment
    set upvote_count = upvote_count - 1
    where id = OLD.comment_id;
    return OLD;
  end if;
  return null;
end;
$$;

alter function "public"."update_comment_upvote_count" () owner to "postgres";

create or replace function "public"."update_parent_playlist_timestamp" () returns "trigger" language "plpgsql" security definer as $$
begin
  -- Update the parent playlist's updated_at timestamp
  -- Works for both INSERT/UPDATE (NEW) and DELETE (OLD) operations
  update public.phrase_playlist
  set updated_at = now()
  where id = coalesce(NEW.playlist_id, OLD.playlist_id);

  return coalesce(NEW, OLD);
end;
$$;

alter function "public"."update_parent_playlist_timestamp" () owner to "postgres";

create or replace function "public"."update_phrase_playlist_timestamp" () returns "trigger" language "plpgsql" as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

alter function "public"."update_phrase_playlist_timestamp" () owner to "postgres";

create or replace function "public"."update_phrase_playlist_upvote_count" () returns "trigger" language "plpgsql" security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update phrase_playlist
    set upvote_count = upvote_count + 1
    where id = NEW.playlist_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update phrase_playlist
    set upvote_count = upvote_count - 1
    where id = OLD.playlist_id;
    return OLD;
  end if;
  return null;
end;
$$;

alter function "public"."update_phrase_playlist_upvote_count" () owner to "postgres";

create or replace function "public"."update_phrase_request_timestamp" () returns "trigger" language "plpgsql" as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

alter function "public"."update_phrase_request_timestamp" () owner to "postgres";

create or replace function "public"."update_phrase_request_upvote_count" () returns "trigger" language "plpgsql" security definer as $$
begin
  if (TG_OP = 'INSERT') then
    update phrase_request
    set upvote_count = upvote_count + 1
    where id = NEW.request_id;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    update phrase_request
    set upvote_count = upvote_count - 1
    where id = OLD.request_id;
    return OLD;
  end if;
  return null;
end;
$$;

alter function "public"."update_phrase_request_upvote_count" () owner to "postgres";

set
	default_tablespace = '';

set
	default_table_access_method = "heap";

create table if not exists "public"."chat_message" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"sender_uid" "uuid" default "auth"."uid" () not null,
	"recipient_uid" "uuid" not null,
	"message_type" "public"."chat_message_type" not null,
	"phrase_id" "uuid",
	"related_message_id" "uuid",
	"content" "jsonb",
	"lang" character varying not null,
	"request_id" "uuid",
	constraint "uids_are_different" check (("sender_uid" <> "recipient_uid"))
);

alter table "public"."chat_message" owner to "postgres";

comment on column "public"."chat_message"."sender_uid" is 'The user who sent the message.';

comment on column "public"."chat_message"."recipient_uid" is 'The user who received the message.';

comment on column "public"."chat_message"."message_type" is 'The type of message, e.g., a phrase recommendation.';

comment on column "public"."chat_message"."phrase_id" is 'If it''s a recommendation, this links to the phrase.';

comment on column "public"."chat_message"."related_message_id" is 'If this message is a reply/reaction to another (e.g. accepting a recommendation).';

comment on column "public"."chat_message"."content" is 'Flexible JSONB for extra data, like the text of an accepted phrase.';

create table if not exists "public"."comment_phrase_link" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"request_id" "uuid" not null,
	"comment_id" "uuid" not null,
	"phrase_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."comment_phrase_link" owner to "postgres";

create table if not exists "public"."comment_upvote" (
	"comment_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."comment_upvote" owner to "postgres";

create table if not exists "public"."phrase" (
	"text" "text" not null,
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" () not null,
	"lang" character varying not null,
	"created_at" timestamp with time zone default "now" () not null,
	"text_script" "text"
);

alter table "public"."phrase" owner to "postgres";

comment on column "public"."phrase"."added_by" is 'User who added this card';

comment on column "public"."phrase"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists "public"."phrase_tag" (
	"phrase_id" "uuid" not null,
	"tag_id" "uuid" not null,
	"created_at" timestamp with time zone default "now" () not null,
	"added_by" "uuid" default "auth"."uid" () not null
);

alter table "public"."phrase_tag" owner to "postgres";

create table if not exists "public"."tag" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"name" "text" not null,
	"lang" character varying not null,
	"added_by" "uuid" default "auth"."uid" ()
);

alter table "public"."tag" owner to "postgres";

create table if not exists "public"."user_card" (
	"uid" "uuid" default "auth"."uid" () not null,
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"phrase_id" "uuid" not null,
	"updated_at" timestamp with time zone default "now" (),
	"created_at" timestamp with time zone default "now" (),
	"status" "public"."card_status" default 'active'::"public"."card_status",
	"lang" character varying not null
);

alter table "public"."user_card" owner to "postgres";

comment on table "public"."user_card" is 'Which card is in which deck, and its status';

comment on column "public"."user_card"."uid" is 'The owner user''s ID';

create table if not exists "public"."user_card_review" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"score" smallint not null,
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric,
	"created_at" timestamp with time zone default "now" () not null,
	"updated_at" timestamp with time zone default "now" () not null,
	"day_session" "date" not null,
	"lang" character varying not null,
	"phrase_id" "uuid" not null,
	"day_first_review" boolean default true not null,
	constraint "user_card_review_difficulty_check" check (
		(
			("difficulty" >= 1.0)
			and ("difficulty" <= 10.0)
		)
	),
	constraint "user_card_review_retrievability_check" check (
		(
			("review_time_retrievability" is null)
			or (
				("review_time_retrievability" >= 0.0)
				and ("review_time_retrievability" <= 1.0)
			)
		)
	),
	constraint "user_card_review_score_check" check (("score" = any (array[1, 2, 3, 4]))),
	constraint "user_card_review_stability_check" check (("stability" >= 0.0)),
	constraint "user_card_review_stability_max_check" check (("stability" <= 36500.0))
);

alter table "public"."user_card_review" owner to "postgres";

create or replace view "public"."user_card_plus"
with
	("security_invoker" = 'true') as
with
	"review" as (
		select
			"rev"."id",
			"rev"."uid",
			"rev"."score",
			"rev"."difficulty",
			"rev"."stability",
			"rev"."review_time_retrievability",
			"rev"."created_at",
			"rev"."updated_at",
			"rev"."day_session",
			"rev"."lang",
			"rev"."phrase_id"
		from
			(
				"public"."user_card_review" "rev"
				left join "public"."user_card_review" "rev2" on (
					(
						("rev"."phrase_id" = "rev2"."phrase_id")
						and ("rev"."uid" = "rev2"."uid")
						and ("rev"."created_at" < "rev2"."created_at")
					)
				)
			)
		where
			("rev2"."created_at" is null)
	)
select
	"card"."lang",
	"card"."id",
	"card"."uid",
	"card"."status",
	"card"."phrase_id",
	"card"."created_at",
	"card"."updated_at",
	"review"."created_at" as "last_reviewed_at",
	"review"."difficulty",
	"review"."stability",
	current_timestamp as "current_timestamp",
	nullif(
		"power" (
			(
				1.0 + (
					(
						(19.0 / 81.0) * (
							(
								extract(
									epoch
									from
										(current_timestamp - "review"."created_at")
								) / 3600.0
							) / 24.0
						)
					) / nullif("review"."stability", (0)::numeric)
				)
			),
			'-0.5'::numeric
		),
		'NaN'::numeric
	) as "retrievability_now"
from
	(
		"public"."user_card" "card"
		left join "review" on (
			(
				("card"."phrase_id" = "review"."phrase_id")
				and ("card"."uid" = "review"."uid")
			)
		)
	);

alter table "public"."user_card_plus" owner to "postgres";

create or replace view "public"."phrase_meta" as
with
	"tags" as (
		select
			"pt"."phrase_id" as "t_phrase_id",
			(
				"json_agg" (
					distinct "jsonb_build_object" ('id', "tag"."id", 'name', "tag"."name")
				) filter (
					where
						("tag"."id" is not null)
				)
			)::"jsonb" as "tags"
		from
			(
				"public"."phrase_tag" "pt"
				left join "public"."tag" "tag" on (("tag"."id" = "pt"."tag_id"))
			)
		group by
			"pt"."phrase_id"
	),
	"cards" as (
		select
			"card"."phrase_id" as "c_phrase_id",
			"count" (*) as "count_learners",
			"avg" ("card"."difficulty") as "avg_difficulty",
			"avg" ("card"."stability") as "avg_stability"
		from
			"public"."user_card_plus" "card"
		where
			(
				"card"."status" = any (
					array[
						'active'::"public"."card_status",
						'learned'::"public"."card_status"
					]
				)
			)
		group by
			"card"."phrase_id"
	)
select
	"phrase"."id",
	"phrase"."lang",
	"phrase"."text",
	"phrase"."created_at",
	"phrase"."added_by",
	coalesce("cards"."count_learners", (0)::bigint) as "count_learners",
	"cards"."avg_difficulty",
	"cards"."avg_stability",
	coalesce("tags"."tags", '[]'::"jsonb") as "tags"
from
	(
		(
			"public"."phrase" "phrase"
			left join "cards" on (("cards"."c_phrase_id" = "phrase"."id"))
		)
		left join "tags" on (("tags"."t_phrase_id" = "phrase"."id"))
	);

alter table "public"."phrase_meta" owner to "postgres";

create table if not exists "public"."phrase_playlist" (
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"title" "text" not null,
	"description" "text",
	"href" "text",
	"created_at" timestamp with time zone default "now" () not null,
	"lang" character varying not null,
	"upvote_count" integer default 0 not null,
	"deleted" boolean default false not null,
	"updated_at" timestamp with time zone default "now" ()
);

alter table "public"."phrase_playlist" owner to "postgres";

create table if not exists "public"."phrase_request" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"requester_uid" "uuid" not null,
	"lang" character varying not null,
	"prompt" "text" not null,
	"upvote_count" integer default 0 not null,
	"deleted" boolean default false not null,
	"updated_at" timestamp with time zone default "now" ()
);

alter table "public"."phrase_request" owner to "postgres";

create table if not exists "public"."playlist_phrase_link" (
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"phrase_id" "uuid" not null,
	"playlist_id" "uuid" not null,
	"order" double precision,
	"href" "text",
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."playlist_phrase_link" owner to "postgres";

create or replace view "public"."feed_activities" as
select
	"pr"."id",
	'request'::"text" as "type",
	"pr"."created_at",
	"pr"."lang",
	"pr"."requester_uid" as "uid",
	"jsonb_build_object" ('prompt', "pr"."prompt", 'upvote_count', "pr"."upvote_count") as "payload"
from
	"public"."phrase_request" "pr"
where
	("pr"."deleted" = false)
union all
select
	"pp"."id",
	'playlist'::"text" as "type",
	"pp"."created_at",
	"pp"."lang",
	"pp"."uid",
	"jsonb_build_object" (
		'title',
		"pp"."title",
		'description',
		"pp"."description",
		'upvote_count',
		"pp"."upvote_count",
		'phrase_count',
		(
			select
				"count" (*) as "count"
			from
				"public"."playlist_phrase_link"
			where
				("playlist_phrase_link"."playlist_id" = "pp"."id")
		)
	) as "payload"
from
	"public"."phrase_playlist" "pp"
where
	("pp"."deleted" = false)
union all
select distinct
	on ("p"."id") "p"."id",
	'phrase'::"text" as "type",
	"p"."created_at",
	"p"."lang",
	"p"."added_by" as "uid",
	"jsonb_build_object" (
		'text',
		"p"."text",
		'source',
		case
			when ("cpl"."request_id" is not null) then "jsonb_build_object" (
				'type',
				'request',
				'id',
				"cpl"."request_id",
				'comment_id',
				"cpl"."comment_id"
			)
			when ("ppl"."playlist_id" is not null) then "jsonb_build_object" (
				'type',
				'playlist',
				'id',
				"ppl"."playlist_id",
				'title',
				"playlist"."title",
				'follows',
				("p"."count_learners")::integer
			)
			else null::"jsonb"
		end
	) as "payload"
from
	(
		(
			(
				"public"."phrase_meta" "p"
				left join "public"."comment_phrase_link" "cpl" on (("p"."id" = "cpl"."phrase_id"))
			)
			left join "public"."playlist_phrase_link" "ppl" on (("p"."id" = "ppl"."phrase_id"))
		)
		left join "public"."phrase_playlist" "playlist" on (("ppl"."playlist_id" = "playlist"."id"))
	)
where
	(
		("p"."added_by" is not null)
		and ("cpl"."id" is null)
		and ("ppl"."id" is null)
	);

alter table "public"."feed_activities" owner to "postgres";

create table if not exists "public"."friend_request_action" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"uid_by" "uuid" not null,
	"uid_for" "uuid" not null,
	"created_at" timestamp with time zone default "now" () not null,
	"action_type" "public"."friend_request_response",
	"uid_less" "uuid",
	"uid_more" "uuid"
);

alter table "public"."friend_request_action" owner to "postgres";

comment on column "public"."friend_request_action"."uid_less" is 'The lesser of the two UIDs (to prevent cases where B-A duplicates A-B)';

comment on column "public"."friend_request_action"."uid_more" is 'The greater of the two UIDs (to prevent cases where B-A duplicates A-B)';

create or replace view "public"."friend_summary"
with
	("security_invoker" = 'true') as
select distinct
	on ("a"."uid_less", "a"."uid_more") "a"."uid_less",
	"a"."uid_more",
	case
		when (
			"a"."action_type" = 'accept'::"public"."friend_request_response"
		) then 'friends'::"text"
		when (
			"a"."action_type" = 'invite'::"public"."friend_request_response"
		) then 'pending'::"text"
		when (
			"a"."action_type" = any (
				array[
					'decline'::"public"."friend_request_response",
					'cancel'::"public"."friend_request_response",
					'remove'::"public"."friend_request_response"
				]
			)
		) then 'unconnected'::"text"
		else null::"text"
	end as "status",
	"a"."created_at" as "most_recent_created_at",
	"a"."uid_by" as "most_recent_uid_by",
	"a"."uid_for" as "most_recent_uid_for",
	"a"."action_type" as "most_recent_action_type",
	case
		when ("a"."uid_by" = "auth"."uid" ()) then "a"."uid_for"
		else "a"."uid_by"
	end as "uid"
from
	"public"."friend_request_action" "a"
order by
	"a"."uid_less",
	"a"."uid_more",
	"a"."created_at" desc;

alter table "public"."friend_summary" owner to "postgres";

create table if not exists "public"."language" (
	"name" "text" not null,
	"lang" character varying not null,
	"alias_of" character varying
);

alter table "public"."language" owner to "postgres";

comment on table "public"."language" is 'The languages that people are trying to learn';

create table if not exists "public"."user_deck" (
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"lang" character varying not null,
	"created_at" timestamp with time zone default "now" () not null,
	"learning_goal" "public"."learning_goal" default 'moving'::"public"."learning_goal" not null,
	"archived" boolean default false not null,
	"daily_review_goal" smallint default 15 not null,
	"preferred_translation_lang" character varying(3) default null::character varying,
	constraint "daily_review_goal_valid_values" check (("daily_review_goal" = any (array[10, 15, 20])))
);

alter table "public"."user_deck" owner to "postgres";

comment on table "public"."user_deck" is 'A set of cards in one language which user intends to learn @graphql({"name": "UserDeck"})';

comment on column "public"."user_deck"."uid" is 'The owner user''s ID';

comment on column "public"."user_deck"."lang" is 'The 3-letter code for the language (iso-369-3)';

comment on column "public"."user_deck"."created_at" is 'the moment the deck was created';

comment on column "public"."user_deck"."learning_goal" is 'why are you learning this language?';

comment on column "public"."user_deck"."archived" is 'is the deck archived or active';

create or replace view "public"."meta_language" as
with
	"first" as (
		select
			"l"."lang",
			"l"."name",
			"l"."alias_of",
			(
				select
					"count" (distinct "d"."uid") as "count"
				from
					"public"."user_deck" "d"
				where
					(("l"."lang")::"text" = ("d"."lang")::"text")
			) as "learners",
			(
				select
					"count" (distinct "p"."id") as "count"
				from
					"public"."phrase" "p"
				where
					(("l"."lang")::"text" = ("p"."lang")::"text")
			) as "phrases_to_learn"
		from
			"public"."language" "l"
		group by
			"l"."lang",
			"l"."name",
			"l"."alias_of"
	),
	"second" as (
		select
			"first"."lang",
			"first"."name",
			"first"."alias_of",
			"first"."learners",
			"first"."phrases_to_learn",
			("first"."learners" * "first"."phrases_to_learn") as "display_score"
		from
			"first"
		order by
			("first"."learners" * "first"."phrases_to_learn") desc
	)
select
	"second"."lang",
	"second"."name",
	"second"."alias_of",
	"second"."learners",
	"second"."phrases_to_learn",
	"rank" () over (
		order by
			"second"."display_score" desc
	) as "rank",
	"rank" () over (
		order by
			"second"."display_score" desc,
			"second"."name"
	) as "display_order"
from
	"second";

alter table "public"."meta_language" owner to "postgres";

create table if not exists "public"."phrase_playlist_upvote" (
	"playlist_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."phrase_playlist_upvote" owner to "postgres";

create table if not exists "public"."phrase_relation" (
	"from_phrase_id" "uuid",
	"to_phrase_id" "uuid",
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"added_by" "uuid" default "auth"."uid" () not null
);

alter table "public"."phrase_relation" owner to "postgres";

comment on column "public"."phrase_relation"."added_by" is 'User who added this association';

create table if not exists "public"."phrase_request_upvote" (
	"request_id" "uuid" not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."phrase_request_upvote" owner to "postgres";

create table if not exists "public"."phrase_translation" (
	"text" "text" not null,
	"literal" "text",
	"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
	"phrase_id" "uuid" not null,
	"added_by" "uuid" default "auth"."uid" () not null,
	"lang" character varying not null,
	"text_script" "text",
	"created_at" timestamp with time zone default "now" () not null
);

alter table "public"."phrase_translation" owner to "postgres";

comment on table "public"."phrase_translation" is 'A translation of one phrase into another language';

comment on column "public"."phrase_translation"."added_by" is 'User who added this translation';

comment on column "public"."phrase_translation"."lang" is 'The 3-letter code for the language (iso-369-3)';

create table if not exists "public"."user_profile" (
	"uid" "uuid" default "auth"."uid" () not null,
	"username" "text",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone default "now" () not null,
	"avatar_path" "text",
	"languages_known" "jsonb" default '[]'::"jsonb" not null,
	"font_preference" "text" default 'default'::"text",
	constraint "user_profile_font_preference_check" check (
		(
			"font_preference" = any (array['default'::"text", 'dyslexic'::"text"])
		)
	),
	constraint "username_length" check (("char_length" ("username") >= 3))
);

alter table "public"."user_profile" owner to "postgres";

comment on column "public"."user_profile"."uid" is 'Primary key (same as auth.users.id and uid())';

create or replace view "public"."public_profile" as
select
	"user_profile"."uid",
	"user_profile"."username",
	"user_profile"."avatar_path"
from
	"public"."user_profile";

alter table "public"."public_profile" owner to "postgres";

create table if not exists "public"."request_comment" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"request_id" "uuid" not null,
	"parent_comment_id" "uuid",
	"uid" "uuid" default "auth"."uid" () not null,
	"content" "text" not null,
	"created_at" timestamp with time zone default "now" () not null,
	"updated_at" timestamp with time zone default "now" () not null,
	"upvote_count" integer default 0 not null
);

alter table "public"."request_comment" owner to "postgres";

create table if not exists "public"."user_client_event" (
	"id" "uuid" default "gen_random_uuid" () not null,
	"created_at" timestamp with time zone default "now" () not null,
	"uid" "uuid" default "auth"."uid" (),
	"message" "text",
	"context" "jsonb",
	"url" "text"
);

alter table "public"."user_client_event" owner to "postgres";

create or replace view "public"."user_deck_plus"
with
	("security_invoker" = 'true') as
select
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	(
		select
			"l"."name"
		from
			"public"."language" "l"
		where
			(("l"."lang")::"text" = ("d"."lang")::"text")
		limit
			1
	) as "language",
	"d"."created_at",
	"count" (*) filter (
		where
			("c"."status" = 'learned'::"public"."card_status")
	) as "cards_learned",
	"count" (*) filter (
		where
			("c"."status" = 'active'::"public"."card_status")
	) as "cards_active",
	"count" (*) filter (
		where
			("c"."status" = 'skipped'::"public"."card_status")
	) as "cards_skipped",
	(
		select
			"count" (*) as "count"
		from
			"public"."phrase" "p"
		where
			(("p"."lang")::"text" = ("d"."lang")::"text")
	) as "lang_total_phrases",
	(
		select
			"max" ("r"."created_at") as "max"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
			)
		limit
			1
	) as "most_recent_review_at",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) as "count_reviews_7d",
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
				and ("r"."score" >= 2)
			)
		limit
			1
	) as "count_reviews_7d_positive"
from
	(
		"public"."user_deck" "d"
		left join "public"."user_card" "c" on (
			(
				(("d"."lang")::"text" = ("c"."lang")::"text")
				and ("d"."uid" = "c"."uid")
			)
		)
	)
group by
	"d"."uid",
	"d"."lang",
	"d"."learning_goal",
	"d"."archived",
	"d"."daily_review_goal",
	"d"."created_at"
order by
	(
		select
			"count" (*) as "count"
		from
			"public"."user_card_review" "r"
		where
			(
				(("r"."lang")::"text" = ("d"."lang")::"text")
				and ("r"."uid" = "d"."uid")
				and ("r"."created_at" > ("now" () - '7 days'::interval))
			)
		limit
			1
	) desc nulls last,
	"d"."created_at" desc;

alter table "public"."user_deck_plus" owner to "postgres";

create table if not exists "public"."user_deck_review_state" (
	"lang" character varying not null,
	"uid" "uuid" default "auth"."uid" () not null,
	"day_session" "date" not null,
	"created_at" timestamp with time zone default "now" () not null,
	"manifest" "jsonb"
);

alter table "public"."user_deck_review_state" owner to "postgres";

alter table only "public"."phrase"
add constraint "card_phrase_id_int_key" unique ("id");

alter table only "public"."phrase"
add constraint "card_phrase_pkey" primary key ("id");

alter table only "public"."phrase_relation"
add constraint "card_see_also_pkey" primary key ("id");

alter table only "public"."phrase_relation"
add constraint "card_see_also_uuid_key" unique ("id");

alter table only "public"."phrase_translation"
add constraint "card_translation_pkey" primary key ("id");

alter table only "public"."phrase_translation"
add constraint "card_translation_uuid_key" unique ("id");

alter table only "public"."chat_message"
add constraint "chat_message_pkey" primary key ("id");

alter table only "public"."comment_phrase_link"
add constraint "comment_phrase_link_pkey" primary key ("id");

alter table only "public"."comment_upvote"
add constraint "comment_upvote_pkey" primary key ("comment_id", "uid");

alter table only "public"."friend_request_action"
add constraint "friend_request_action_pkey" primary key ("id");

alter table only "public"."language"
add constraint "language_code2_key" unique ("lang");

alter table only "public"."language"
add constraint "language_pkey" primary key ("lang");

alter table only "public"."user_deck"
add constraint "one_deck_per_language_per_user" unique ("uid", "lang");

alter table only "public"."phrase_playlist"
add constraint "phrase_playlist_pkey" primary key ("id");

alter table only "public"."phrase_playlist_upvote"
add constraint "phrase_playlist_upvote_pkey" primary key ("playlist_id", "uid");

alter table only "public"."phrase_request"
add constraint "phrase_request_pkey" primary key ("id");

alter table only "public"."phrase_request_upvote"
add constraint "phrase_request_upvote_pkey" primary key ("request_id", "uid");

alter table only "public"."phrase_tag"
add constraint "phrase_tag_pkey" primary key ("phrase_id", "tag_id");

alter table only "public"."playlist_phrase_link"
add constraint "playlist_phrase_link_pkey" primary key ("id");

alter table only "public"."user_profile"
add constraint "profile_old_id_key" unique ("uid");

alter table only "public"."user_profile"
add constraint "profiles_pkey" primary key ("uid");

alter table only "public"."user_profile"
add constraint "profiles_username_key" unique ("username");

alter table only "public"."request_comment"
add constraint "request_comment_pkey" primary key ("id");

alter table only "public"."tag"
add constraint "tag_name_lang_key" unique ("name", "lang");

alter table only "public"."tag"
add constraint "tag_pkey" primary key ("id");

alter table only "public"."comment_upvote"
add constraint "unique_user_comment_upvote" unique ("comment_id", "uid");

alter table only "public"."user_card_review"
add constraint "user_card_review_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_card_uid_phrase_id_key" unique ("uid", "phrase_id");

alter table only "public"."user_client_event"
add constraint "user_client_event_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_pkey" primary key ("id");

alter table only "public"."user_card"
add constraint "user_deck_card_membership_uuid_key" unique ("id");

alter table only "public"."user_deck"
add constraint "user_deck_pkey" primary key ("id");

alter table only "public"."user_deck_review_state"
add constraint "user_deck_review_state_pkey" primary key ("lang", "uid", "day_session");

alter table only "public"."user_deck"
add constraint "user_deck_uuid_key" unique ("id");

create index "chat_message_recipient_uid_sender_uid_created_at_idx" on "public"."chat_message" using "btree" ("recipient_uid", "sender_uid", "created_at" desc);

create index "chat_message_sender_uid_recipient_uid_created_at_idx" on "public"."chat_message" using "btree" ("sender_uid", "recipient_uid", "created_at" desc);

create index "idx_comment_created_at" on "public"."request_comment" using "btree" ("parent_comment_id", "created_at");

create index "idx_comment_parent" on "public"."request_comment" using "btree" ("parent_comment_id");

create index "idx_comment_phrase_link_comment" on "public"."comment_phrase_link" using "btree" ("comment_id");

create index "idx_comment_phrase_link_phrase" on "public"."comment_phrase_link" using "btree" ("phrase_id");

create index "idx_comment_phrase_link_request" on "public"."comment_phrase_link" using "btree" ("request_id");

create index "idx_comment_request_id" on "public"."request_comment" using "btree" ("request_id");

create index "idx_comment_upvotes" on "public"."request_comment" using "btree" ("request_id", "upvote_count" desc);

create index "idx_upvote_comment" on "public"."comment_upvote" using "btree" ("comment_id");

create index "idx_upvote_user" on "public"."comment_upvote" using "btree" ("uid");

create index "phrase_playlist_uid_idx" on "public"."phrase_playlist" using "btree" ("uid");

create index "playlist_phrase_link_phrase_id_idx" on "public"."playlist_phrase_link" using "btree" ("phrase_id");

create index "playlist_phrase_link_playlist_id_idx" on "public"."playlist_phrase_link" using "btree" ("playlist_id");

create unique index "uid_card" on "public"."user_card" using "btree" ("uid", "phrase_id");

create unique index "uid_deck" on "public"."user_deck" using "btree" ("uid", "lang");

create unique index "unique_text_phrase_lang" on "public"."phrase_translation" using "btree" ("text", "lang", "phrase_id");

create or replace trigger "on_phrase_playlist_updated" before
update on "public"."phrase_playlist" for each row
execute function "public"."update_phrase_playlist_timestamp" ();

create or replace trigger "on_phrase_playlist_upvote_added"
after insert on "public"."phrase_playlist_upvote" for each row
execute function "public"."update_phrase_playlist_upvote_count" ();

create or replace trigger "on_phrase_playlist_upvote_removed"
after delete on "public"."phrase_playlist_upvote" for each row
execute function "public"."update_phrase_playlist_upvote_count" ();

create or replace trigger "on_phrase_request_updated" before
update on "public"."phrase_request" for each row
execute function "public"."update_phrase_request_timestamp" ();

create or replace trigger "on_phrase_request_upvote_added"
after insert on "public"."phrase_request_upvote" for each row
execute function "public"."update_phrase_request_upvote_count" ();

create or replace trigger "on_phrase_request_upvote_removed"
after delete on "public"."phrase_request_upvote" for each row
execute function "public"."update_phrase_request_upvote_count" ();

create or replace trigger "on_playlist_phrase_link_changed"
after insert
or delete on "public"."playlist_phrase_link" for each row
execute function "public"."update_parent_playlist_timestamp" ();

create or replace trigger "on_playlist_phrase_link_updated"
after
update on "public"."playlist_phrase_link" for each row
execute function "public"."update_parent_playlist_timestamp" ();

create or replace trigger "tr_update_comment_upvote_count"
after insert
or delete on "public"."comment_upvote" for each row
execute function "public"."update_comment_upvote_count" ();

alter table only "public"."chat_message"
add constraint "chat_message_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_recipient_uid_fkey" foreign key ("recipient_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."chat_message"
add constraint "chat_message_related_message_id_fkey" foreign key ("related_message_id") references "public"."chat_message" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete set null;

alter table only "public"."chat_message"
add constraint "chat_message_sender_uid_fkey" foreign key ("sender_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."comment_phrase_link"
add constraint "comment_phrase_link_comment_id_fkey" foreign key ("comment_id") references "public"."request_comment" ("id") on delete cascade;

alter table only "public"."comment_phrase_link"
add constraint "comment_phrase_link_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."comment_phrase_link"
add constraint "comment_phrase_link_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete cascade;

alter table only "public"."comment_upvote"
add constraint "comment_upvote_comment_id_fkey" foreign key ("comment_id") references "public"."request_comment" ("id") on delete cascade;

alter table only "public"."comment_upvote"
add constraint "comment_upvote_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_by_fkey" foreign key ("uid_by") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_for_fkey" foreign key ("uid_for") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_less_fkey" foreign key ("uid_less") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."friend_request_action"
add constraint "friend_request_action_uid_more_fkey" foreign key ("uid_more") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."phrase"
add constraint "phrase_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase"
add constraint "phrase_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_playlist"
add constraint "phrase_playlist_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete set null;

alter table only "public"."phrase_playlist_upvote"
add constraint "phrase_playlist_upvote_playlist_id_fkey" foreign key ("playlist_id") references "public"."phrase_playlist" ("id") on delete cascade;

alter table only "public"."phrase_playlist_upvote"
add constraint "phrase_playlist_upvote_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."phrase_request"
add constraint "phrase_request_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on delete cascade;

alter table only "public"."phrase_request"
add constraint "phrase_request_requester_uid_fkey" foreign key ("requester_uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."phrase_request_upvote"
add constraint "phrase_request_upvote_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete cascade;

alter table only "public"."phrase_request_upvote"
add constraint "phrase_request_upvote_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_from_phrase_id_fkey" foreign key ("from_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_relation"
add constraint "phrase_see_also_to_phrase_id_fkey" foreign key ("to_phrase_id") references "public"."phrase" ("id");

alter table only "public"."phrase_tag"
add constraint "phrase_tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."phrase_tag"
add constraint "phrase_tag_tag_id_fkey" foreign key ("tag_id") references "public"."tag" ("id") on delete cascade;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."phrase_translation"
add constraint "phrase_translation_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."phrase_translation"
add constraint "phrase_translation_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."playlist_phrase_link"
add constraint "playlist_phrase_link_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."playlist_phrase_link"
add constraint "playlist_phrase_link_playlist_id_fkey" foreign key ("playlist_id") references "public"."phrase_playlist" ("id") on delete cascade;

alter table only "public"."request_comment"
add constraint "request_comment_parent_comment_id_fkey" foreign key ("parent_comment_id") references "public"."request_comment" ("id") on delete cascade;

alter table only "public"."request_comment"
add constraint "request_comment_request_id_fkey" foreign key ("request_id") references "public"."phrase_request" ("id") on delete cascade;

alter table only "public"."request_comment"
add constraint "request_comment_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on delete cascade;

alter table only "public"."tag"
add constraint "tag_added_by_fkey" foreign key ("added_by") references "public"."user_profile" ("uid") on delete set null;

alter table only "public"."tag"
add constraint "tag_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_lang_fkey" foreign key ("lang") references "public"."language" ("lang") on update cascade on delete cascade;

alter table only "public"."user_card"
add constraint "user_card_lang_uid_fkey" foreign key ("uid", "lang") references "public"."user_deck" ("uid", "lang");

alter table only "public"."user_card"
add constraint "user_card_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_lang_uid_fkey" foreign key ("uid", "lang") references "public"."user_deck" ("uid", "lang");

alter table only "public"."user_card_review"
add constraint "user_card_review_phrase_id_fkey" foreign key ("phrase_id") references "public"."phrase" ("id") on update cascade on delete set null;

alter table only "public"."user_card_review"
add constraint "user_card_review_phrase_id_uid_fkey" foreign key ("uid", "phrase_id") references "public"."user_card" ("uid", "phrase_id");

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_card_review"
add constraint "user_card_review_uid_lang_day_session_fkey" foreign key ("uid", "lang", "day_session") references "public"."user_deck_review_state" ("uid", "lang", "day_session") on update cascade on delete set null;

alter table only "public"."user_card"
add constraint "user_card_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

alter table only "public"."user_client_event"
add constraint "user_client_event_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete set null;

alter table only "public"."user_deck"
add constraint "user_deck_lang_fkey" foreign key ("lang") references "public"."language" ("lang");

alter table only "public"."user_deck_review_state"
add constraint "user_deck_review_state_lang_uid_fkey" foreign key ("lang", "uid") references "public"."user_deck" ("lang", "uid") on update cascade on delete cascade;

alter table only "public"."user_deck"
add constraint "user_deck_uid_fkey" foreign key ("uid") references "public"."user_profile" ("uid") on update cascade on delete cascade;

create policy "Anyone can add cards" on "public"."phrase" for insert to "authenticated"
with
	check (true);

create policy "Enable delete for users based on uid" on "public"."phrase_playlist" for delete to "authenticated" using (
	(
		(
			select
				"auth"."uid" () as "uid"
		) = "uid"
	)
);

create policy "Enable delete for users based on uid" on "public"."playlist_phrase_link" for delete to "authenticated" using (
	(
		(
			select
				"auth"."uid" () as "uid"
		) = "uid"
	)
);

create policy "Enable insert for any user" on "public"."user_client_event" for insert to "authenticated",
"anon"
with
	check (true);

create policy "Enable insert for authenticated users only" on "public"."user_card_review" for insert to "authenticated"
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable insert for authenticated users only" on "public"."user_deck_review_state" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Enable insert for users based on uid" on "public"."phrase_playlist" for insert to "authenticated"
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable insert for users based on uid" on "public"."playlist_phrase_link" for insert to "authenticated"
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable read access for all users" on "public"."comment_phrase_link" for
select
	using (true);

create policy "Enable read access for all users" on "public"."language" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_playlist" for
select
	using (
		(
			("deleted" = false)
			or ("uid" = "auth"."uid" ())
		)
	);

create policy "Enable read access for all users" on "public"."phrase_relation" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_request" for
select
	using (
		(
			("deleted" = false)
			or ("requester_uid" = "auth"."uid" ())
		)
	);

create policy "Enable read access for all users" on "public"."phrase_tag" for
select
	using (true);

create policy "Enable read access for all users" on "public"."phrase_translation" for
select
	using (true);

create policy "Enable read access for all users" on "public"."playlist_phrase_link" for
select
	using (true);

create policy "Enable read access for all users" on "public"."request_comment" for
select
	using (true);

create policy "Enable read access for all users" on "public"."tag" for
select
	using (true);

create policy "Enable update for users based on uid" on "public"."playlist_phrase_link"
for update
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	)
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to update their own data only" on "public"."user_card_review"
for update
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	)
with
	check (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to view their own data only" on "public"."comment_upvote" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to view their own data only" on "public"."friend_request_action" for
select
	to "authenticated" using (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_by"
			)
			or (
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_for"
			)
		)
	);

create policy "Enable users to view their own data only" on "public"."user_card_review" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to view their own data only" on "public"."user_deck_review_state" for
select
	to "authenticated" using (
		(
			(
				select
					"auth"."uid" () as "uid"
			) = "uid"
		)
	);

create policy "Enable users to view their own upvotes" on "public"."phrase_playlist_upvote" for
select
	to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Enable users to view their own upvotes" on "public"."phrase_request_upvote" for
select
	to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Logged in users can add see_also's" on "public"."phrase_relation" for insert to "authenticated"
with
	check (true);

create policy "Logged in users can add translations" on "public"."phrase_translation" for insert to "authenticated"
with
	check (true);

create policy "Policy with table joins" on "public"."friend_request_action" for insert to "authenticated"
with
	check (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "uid_by"
			)
			and (
				(
					(
						(
							select
								"auth"."uid" () as "uid"
						) = "uid_less"
					)
					and ("uid_for" = "uid_more")
				)
				or (
					(
						(
							select
								"auth"."uid" () as "uid"
						) = "uid_more"
					)
					and ("uid_for" = "uid_less")
				)
			)
		)
	);

create policy "User can view and update their own profile" on "public"."user_profile" to "authenticated" using (("uid" = "auth"."uid" ()))
with
	check (("uid" = "auth"."uid" ()));

create policy "User data only for this user" on "public"."user_card" using (("auth"."uid" () = "uid"))
with
	check (("auth"."uid" () = "uid"));

create policy "User data only for this user" on "public"."user_deck" using (("auth"."uid" () = "uid"))
with
	check (("auth"."uid" () = "uid"));

create policy "Users can create comments" on "public"."request_comment" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Users can create their own requests" on "public"."phrase_request" for insert to "authenticated"
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can create upvotes" on "public"."comment_upvote" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Users can create upvotes" on "public"."phrase_playlist_upvote" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Users can create upvotes" on "public"."phrase_request_upvote" for insert to "authenticated"
with
	check (("uid" = "auth"."uid" ()));

create policy "Users can delete own comments" on "public"."request_comment" for delete to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Users can delete own upvotes" on "public"."comment_upvote" for delete to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Users can delete own upvotes" on "public"."phrase_playlist_upvote" for delete to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Users can delete own upvotes" on "public"."phrase_request_upvote" for delete to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Users can insert phrase links for their own comments" on "public"."comment_phrase_link" for insert to "authenticated"
with
	check (
		(
			("uid" = "auth"."uid" ())
			and (
				exists (
					select
						1
					from
						"public"."request_comment"
					where
						(
							("request_comment"."id" = "comment_phrase_link"."comment_id")
							and ("request_comment"."uid" = "auth"."uid" ())
						)
				)
			)
		)
	);

create policy "Users can insert tags" on "public"."tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

create policy "Users can link tags to phrases" on "public"."phrase_tag" for insert
with
	check (("auth"."role" () = 'authenticated'::"text"));

create policy "Users can send messages to friends" on "public"."chat_message" for insert
with
	check (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "sender_uid"
			)
			and "public"."are_friends" ("sender_uid", "recipient_uid")
		)
	);

create policy "Users can update own comments" on "public"."request_comment"
for update
	to "authenticated" using (("uid" = "auth"."uid" ()));

create policy "Users can update their own playlists" on "public"."phrase_playlist"
for update
	to "authenticated" using (
		(
			("uid" = "auth"."uid" ())
			and ("deleted" = false)
		)
	)
with
	check (("uid" = "auth"."uid" ()));

create policy "Users can update their own requests" on "public"."phrase_request"
for update
	to "authenticated" using (
		(
			("requester_uid" = "auth"."uid" ())
			and ("deleted" = false)
		)
	)
with
	check (("requester_uid" = "auth"."uid" ()));

create policy "Users can view their own chat messages" on "public"."chat_message" for
select
	using (
		(
			(
				(
					select
						"auth"."uid" () as "uid"
				) = "sender_uid"
			)
			or (
				(
					select
						"auth"."uid" () as "uid"
				) = "recipient_uid"
			)
		)
	);

alter table "public"."chat_message" enable row level security;

alter table "public"."comment_phrase_link" enable row level security;

alter table "public"."comment_upvote" enable row level security;

alter table "public"."friend_request_action" enable row level security;

alter table "public"."language" enable row level security;

alter table "public"."phrase" enable row level security;

alter table "public"."phrase_playlist" enable row level security;

alter table "public"."phrase_playlist_upvote" enable row level security;

alter table "public"."phrase_relation" enable row level security;

alter table "public"."phrase_request" enable row level security;

alter table "public"."phrase_request_upvote" enable row level security;

alter table "public"."phrase_tag" enable row level security;

alter table "public"."phrase_translation" enable row level security;

alter table "public"."playlist_phrase_link" enable row level security;

alter table "public"."request_comment" enable row level security;

alter table "public"."tag" enable row level security;

alter table "public"."user_card" enable row level security;

alter table "public"."user_card_review" enable row level security;

alter table "public"."user_client_event" enable row level security;

alter table "public"."user_deck" enable row level security;

alter table "public"."user_deck_review_state" enable row level security;

alter table "public"."user_profile" enable row level security;

alter publication "supabase_realtime" owner to "postgres";

alter publication "supabase_realtime"
add table only "public"."chat_message";

alter publication "supabase_realtime"
add table only "public"."friend_request_action";

revoke usage on schema "public"
from
	public;

grant usage on schema "public" to "anon";

grant usage on schema "public" to "authenticated";

grant usage on schema "public" to "service_role";

grant all on function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text",
	"create_card" boolean
) to "authenticated";

grant all on function "public"."add_phrase_translation_card" (
	"phrase_text" "text",
	"phrase_lang" "text",
	"translation_text" "text",
	"translation_lang" "text",
	"phrase_text_script" "text",
	"translation_text_script" "text",
	"create_card" boolean
) to "service_role";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "authenticated";

grant all on function "public"."add_tags_to_phrase" (
	"p_phrase_id" "uuid",
	"p_lang" character varying,
	"p_tags" "text" []
) to "service_role";

grant all on function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") to "authenticated";

grant all on function "public"."are_friends" ("uid1" "uuid", "uid2" "uuid") to "service_role";

grant all on function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" [],
	"p_user_id" "uuid"
) to "authenticated";

grant all on function "public"."bulk_add_phrases" (
	"p_lang" character,
	"p_phrases" "public"."phrase_with_translations_input" [],
	"p_user_id" "uuid"
) to "service_role";

grant all on function "public"."create_comment_with_phrases" (
	"p_request_id" "uuid",
	"p_content" "text",
	"p_parent_comment_id" "uuid",
	"p_phrase_ids" "uuid" []
) to "authenticated";

grant all on function "public"."create_comment_with_phrases" (
	"p_request_id" "uuid",
	"p_content" "text",
	"p_parent_comment_id" "uuid",
	"p_phrase_ids" "uuid" []
) to "service_role";

grant all on function "public"."create_playlist_with_links" (
	"lang" "text",
	"title" "text",
	"description" "text",
	"href" "text",
	"phrases" "jsonb"
) to "authenticated";

grant all on function "public"."create_playlist_with_links" (
	"lang" "text",
	"title" "text",
	"description" "text",
	"href" "text",
	"phrases" "jsonb"
) to "authenticated";

grant all on function "public"."create_playlist_with_links" (
	"lang" "text",
	"title" "text",
	"description" "text",
	"href" "text",
	"phrases" "jsonb"
) to "service_role";

grant all on table "public"."user_card_review" to "authenticated";

grant all on table "public"."user_card_review" to "service_role";

grant all on function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "authenticated";

grant all on function "public"."insert_user_card_review" (
	"phrase_id" "uuid",
	"lang" character varying,
	"score" integer,
	"day_session" "text",
	"difficulty" numeric,
	"stability" numeric,
	"review_time_retrievability" numeric
) to "service_role";

grant all on function "public"."set_comment_upvote" ("p_comment_id" "uuid", "p_action" "text") to "authenticated";

grant all on function "public"."set_comment_upvote" ("p_comment_id" "uuid", "p_action" "text") to "service_role";

grant all on function "public"."set_phrase_playlist_upvote" ("p_playlist_id" "uuid", "p_action" "text") to "authenticated";

grant all on function "public"."set_phrase_playlist_upvote" ("p_playlist_id" "uuid", "p_action" "text") to "service_role";

grant all on function "public"."set_phrase_request_upvote" ("p_request_id" "uuid", "p_action" "text") to "authenticated";

grant all on function "public"."set_phrase_request_upvote" ("p_request_id" "uuid", "p_action" "text") to "service_role";

grant all on function "public"."update_comment_upvote_count" () to "authenticated";

grant all on function "public"."update_comment_upvote_count" () to "service_role";

grant all on function "public"."update_parent_playlist_timestamp" () to "authenticated";

grant all on function "public"."update_parent_playlist_timestamp" () to "service_role";

grant all on function "public"."update_phrase_playlist_timestamp" () to "authenticated";

grant all on function "public"."update_phrase_playlist_timestamp" () to "service_role";

grant all on function "public"."update_phrase_playlist_upvote_count" () to "authenticated";

grant all on function "public"."update_phrase_playlist_upvote_count" () to "service_role";

grant all on function "public"."update_phrase_request_timestamp" () to "authenticated";

grant all on function "public"."update_phrase_request_timestamp" () to "service_role";

grant all on function "public"."update_phrase_request_upvote_count" () to "authenticated";

grant all on function "public"."update_phrase_request_upvote_count" () to "service_role";

grant all on table "public"."chat_message" to "authenticated";

grant all on table "public"."chat_message" to "service_role";

grant all on table "public"."comment_phrase_link" to "anon";

grant all on table "public"."comment_phrase_link" to "authenticated";

grant all on table "public"."comment_phrase_link" to "service_role";

grant all on table "public"."comment_upvote" to "authenticated";

grant all on table "public"."comment_upvote" to "service_role";

grant all on table "public"."phrase" to "anon";

grant all on table "public"."phrase" to "authenticated";

grant all on table "public"."phrase" to "service_role";

grant all on table "public"."phrase_tag" to "anon";

grant all on table "public"."phrase_tag" to "authenticated";

grant all on table "public"."phrase_tag" to "service_role";

grant all on table "public"."tag" to "anon";

grant all on table "public"."tag" to "authenticated";

grant all on table "public"."tag" to "service_role";

grant all on table "public"."user_card" to "authenticated";

grant all on table "public"."user_card" to "service_role";

grant all on table "public"."user_card_review" to "authenticated";

grant all on table "public"."user_card_review" to "service_role";

grant all on table "public"."user_card_plus" to "authenticated";

grant all on table "public"."user_card_plus" to "service_role";

grant all on table "public"."phrase_meta" to "anon";

grant all on table "public"."phrase_meta" to "authenticated";

grant all on table "public"."phrase_meta" to "service_role";

grant all on table "public"."phrase_playlist" to "anon";

grant all on table "public"."phrase_playlist" to "authenticated";

grant all on table "public"."phrase_playlist" to "service_role";

grant all on table "public"."phrase_request" to "anon";

grant all on table "public"."phrase_request" to "authenticated";

grant all on table "public"."phrase_request" to "service_role";

grant all on table "public"."playlist_phrase_link" to "anon";

grant all on table "public"."playlist_phrase_link" to "authenticated";

grant all on table "public"."playlist_phrase_link" to "service_role";

grant all on table "public"."feed_activities" to "anon";

grant all on table "public"."feed_activities" to "authenticated";

grant all on table "public"."feed_activities" to "service_role";

grant all on table "public"."friend_request_action" to "anon";

grant all on table "public"."friend_request_action" to "authenticated";

grant all on table "public"."friend_request_action" to "service_role";

grant all on table "public"."friend_summary" to "authenticated";

grant all on table "public"."friend_summary" to "service_role";

grant all on table "public"."language" to "anon";

grant all on table "public"."language" to "authenticated";

grant all on table "public"."language" to "service_role";

grant all on table "public"."user_deck" to "authenticated";

grant all on table "public"."user_deck" to "service_role";

grant all on table "public"."meta_language" to "anon";

grant all on table "public"."meta_language" to "authenticated";

grant all on table "public"."meta_language" to "service_role";

grant all on table "public"."phrase_playlist_upvote" to "authenticated";

grant all on table "public"."phrase_playlist_upvote" to "service_role";

grant all on table "public"."phrase_relation" to "anon";

grant all on table "public"."phrase_relation" to "authenticated";

grant all on table "public"."phrase_relation" to "service_role";

grant all on table "public"."phrase_request_upvote" to "authenticated";

grant all on table "public"."phrase_request_upvote" to "service_role";

grant all on table "public"."phrase_translation" to "anon";

grant all on table "public"."phrase_translation" to "authenticated";

grant all on table "public"."phrase_translation" to "service_role";

grant all on table "public"."user_profile" to "authenticated";

grant all on table "public"."user_profile" to "service_role";

grant all on table "public"."public_profile" to "anon";

grant all on table "public"."public_profile" to "authenticated";

grant all on table "public"."public_profile" to "service_role";

grant all on table "public"."request_comment" to "anon";

grant all on table "public"."request_comment" to "authenticated";

grant all on table "public"."request_comment" to "service_role";

grant all on table "public"."user_client_event" to "anon";

grant all on table "public"."user_client_event" to "authenticated";

grant all on table "public"."user_client_event" to "service_role";

grant all on table "public"."user_deck_plus" to "authenticated";

grant all on table "public"."user_deck_plus" to "service_role";

grant all on table "public"."user_deck_review_state" to "authenticated";

grant all on table "public"."user_deck_review_state" to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on sequences to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on functions to "service_role";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "postgres";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "anon";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "authenticated";

alter default privileges for role "postgres" in schema "public"
grant all on tables to "service_role";
