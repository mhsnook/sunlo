CREATE TABLE "public"."chat_message" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  "recipient_uid"      uuid                     NOT NULL,
  "phrase_id"          uuid,
  "related_message_id" uuid,
  "content"            jsonb,
  "lang"               character varying        NOT NULL,
  "request_id"         uuid,
  "playlist_id"        uuid,
  "read_at"            timestamp with time zone,
  CONSTRAINT "chat_message_pkey" PRIMARY KEY (id),
  CONSTRAINT "chat_message_related_message_id_fkey" FOREIGN KEY (related_message_id) REFERENCES public.chat_message(id) ON DELETE SET NULL,
  CONSTRAINT "chat_message_lang_fkey" FOREIGN KEY (lang) REFERENCES public.language(lang) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "chat_message_phrase_id_fkey" FOREIGN KEY (phrase_id) REFERENCES public.phrase(id) ON DELETE SET NULL,
  CONSTRAINT "chat_message_playlist_id_fkey" FOREIGN KEY (playlist_id) REFERENCES public.phrase_playlist(id) ON DELETE SET NULL,
  CONSTRAINT "chat_message_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.phrase_request(id) ON DELETE SET NULL,
  "sender_uid"         uuid                     NOT NULL DEFAULT auth.uid(),
  CONSTRAINT "uids_are_different" CHECK ((sender_uid <> recipient_uid)),
  CONSTRAINT "chat_message_recipient_uid_fkey" FOREIGN KEY (recipient_uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE,
  CONSTRAINT "chat_message_sender_uid_fkey" FOREIGN KEY (sender_uid) REFERENCES public.user_profile(uid) ON DELETE CASCADE
);

ALTER TABLE "public"."chat_message"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chat_message"
  ADD COLUMN "message_type" public.chat_message_type NOT NULL;

CREATE INDEX chat_message_playlist_id_idx ON public.chat_message USING btree (playlist_id);

CREATE INDEX chat_message_unread_idx ON public.chat_message USING btree (recipient_uid, read_at)
  WHERE (read_at IS NULL);

CREATE POLICY "Recipients can mark messages as read" ON "public"."chat_message"
  FOR UPDATE
  TO PUBLIC
  USING ((( SELECT auth.uid() AS uid) = recipient_uid))
  WITH CHECK ((( SELECT auth.uid() AS uid) = recipient_uid));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_message" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_message" TO "service_role";

CREATE INDEX chat_message_recipient_uid_sender_uid_created_at_idx ON public.chat_message USING btree (recipient_uid, sender_uid, created_at DESC);

CREATE INDEX chat_message_sender_uid_recipient_uid_created_at_idx ON public.chat_message USING btree (sender_uid, recipient_uid, created_at DESC);

CREATE POLICY "Users can send messages to friends" ON "public"."chat_message"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((( SELECT auth.uid() AS uid) = sender_uid) AND public.are_friends(sender_uid, recipient_uid)));

CREATE POLICY "Users can view their own chat messages" ON "public"."chat_message"
  FOR SELECT
  TO PUBLIC
  USING (((( SELECT auth.uid() AS uid) = sender_uid) OR (( SELECT auth.uid() AS uid) = recipient_uid)));

COMMENT ON COLUMN "public"."chat_message"."content" IS 'Flexible JSONB for extra data, like the text of an accepted phrase.';

COMMENT ON COLUMN "public"."chat_message"."message_type" IS 'The type of message, e.g., a phrase recommendation.';

COMMENT ON COLUMN "public"."chat_message"."phrase_id" IS 'If it''s a recommendation, this links to the phrase.';

COMMENT ON COLUMN "public"."chat_message"."read_at" IS 'Timestamp when the recipient read the message. Null means unread.';

COMMENT ON COLUMN "public"."chat_message"."recipient_uid" IS 'The user who received the message.';

COMMENT ON COLUMN "public"."chat_message"."related_message_id" IS 'If this message is a reply/reaction to another (e.g. accepting a recommendation).';

COMMENT ON COLUMN "public"."chat_message"."sender_uid" IS 'The user who sent the message.';

REVOKE ALL ON TABLE "public"."chat_message" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."chat_message" TO "postgres";
