CREATE POLICY "Allow users to select, insert, update 1oj01fe_0" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'avatars'::text));

CREATE POLICY "Allow users to select, insert, update 1oj01fe_1" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "Allow users to select, insert, update 1oj01fe_2" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'avatars'::text));
