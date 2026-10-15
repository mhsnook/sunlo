CREATE VIEW "public"."public_profile" AS  SELECT user_profile.uid,
    user_profile.username,
    user_profile.avatar_path
   FROM public.user_profile;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_profile" TO "anon", "authenticated";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_profile" TO "service_role";

REVOKE ALL ON TABLE "public"."public_profile" FROM "postgres";

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."public_profile" TO "postgres";
