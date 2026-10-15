CREATE TYPE "public"."card_status" AS ENUM (
  'active',
  'learned',
  'skipped'
);

COMMENT ON TYPE "public"."card_status" IS 'card status is either active, learned or skipped';
