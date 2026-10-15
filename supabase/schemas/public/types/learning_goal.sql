CREATE TYPE "public"."learning_goal" AS ENUM (
  'moving',
  'family',
  'visiting'
);

COMMENT ON TYPE "public"."learning_goal" IS 'why are you learning this language?';
