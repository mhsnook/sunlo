create policy "Users can delete phrase links for their own comments" on "public"."comment_phrase_link" for delete to "authenticated" using (uid = auth.uid ());
