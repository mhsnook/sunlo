-- In a new migration file, e.g., supabase/migrations/YYYYMMDDHHMMSS_add_read_markers.sql

CREATE TABLE public.user_chat_read_marker (
	 uid uuid NOT NULL REFERENCES public.user_profile(uid) ON DELETE CASCADE,
	 friend_uid uuid NOT NULL REFERENCES public.user_profile(uid) ON DELETE CASCADE,
	 last_read_at timestamptz NOT NULL,
	 CONSTRAINT user_chat_read_marker_pkey PRIMARY KEY (uid, friend_uid)
);

COMMENT ON TABLE public.user_chat_read_marker IS 'Tracks the last time a user read messages in a chat.';

ALTER TABLE public.user_chat_read_marker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own read markers"
ON public.user_chat_read_marker
FOR ALL
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- An RPC function to make it easy to mark a chat as read from the client
CREATE OR REPLACE FUNCTION public.mark_chat_as_read(p_friend_uid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- A user can't have a chat with themselves
  IF auth.uid() = p_friend_uid THEN
	 RETURN;
  END IF;

  INSERT INTO public.user_chat_read_marker (uid, friend_uid, last_read_at)
  VALUES (auth.uid(), p_friend_uid, now())
  ON CONFLICT (uid, friend_uid)
  DO UPDATE SET last_read_at = now();
END;
$$;