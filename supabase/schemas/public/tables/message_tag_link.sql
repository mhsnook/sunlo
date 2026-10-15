CREATE TABLE "public"."message_tag_link" (
  "message_id" uuid                     NOT NULL,
  "tag_slug"   text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "deleted"    boolean                  NOT NULL DEFAULT false,
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT "message_tag_link_message_id_fkey" FOREIGN KEY (message_id) REFERENCES public.message(id) ON DELETE CASCADE,
  CONSTRAINT "message_tag_link_pkey" PRIMARY KEY (id),
  CONSTRAINT "message_tag_link_tag_slug_fkey" FOREIGN KEY (tag_slug) REFERENCES public.message_tag(slug) ON DELETE CASCADE
);

ALTER TABLE "public"."message_tag_link"
  ENABLE ROW LEVEL SECURITY;

CREATE INDEX message_tag_link_message_id_idx ON public.message_tag_link USING btree (message_id);

CREATE UNIQUE INDEX message_tag_link_message_id_tag_slug_live_idx ON public.message_tag_link USING btree (message_id, tag_slug)
  WHERE (deleted = false);

CREATE INDEX message_tag_link_tag_slug_idx ON public.message_tag_link USING btree (tag_slug);

CREATE TRIGGER guard_message_tag_link_update
  BEFORE UPDATE ON public.message_tag_link
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_soft_delete_only();

CREATE POLICY "Admins can delete message tag links" ON "public"."message_tag_link"
  FOR DELETE
  TO "authenticated"
  USING (public.is_admin());

CREATE POLICY "Admins can insert message tag links" ON "public"."message_tag_link"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update message tag links" ON "public"."message_tag_link"
  FOR UPDATE
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enable read access for all users" ON "public"."message_tag_link"
  FOR SELECT
  TO PUBLIC
  USING (((deleted = false) OR public.is_admin()));

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag_link" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag_link" TO "service_role";

REVOKE ALL ON TABLE "public"."message_tag_link" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."message_tag_link" TO "postgres";
