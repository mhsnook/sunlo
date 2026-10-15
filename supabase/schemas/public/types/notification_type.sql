CREATE TYPE "public"."notification_type" AS ENUM (
  'request_commented',
  'comment_replied',
  'phrase_translated',
  'phrase_referenced',
  'request_upvoted',
  'change_suggested'
);
