-- This file loads LAST (alphabetically after all seed-z-* files).
-- Setting seeded_at here guarantees it is after every DEFAULT now() insert
-- in earlier seed files, so the dump script's created_at.gt filter correctly
-- excludes seeded rows and only captures rows added through app usage.
set
	session_replication_role = replica;

insert into
	"public"."db_meta" ("key", "value")
values
	('seeded_at', now()::text)
on conflict ("key") do update
set
	"value" = excluded."value";

-- Every seed file sets session_replication_role = replica, which disables
-- the statement-level triggers that keep these materialized views in step
-- with source-table writes. Refresh them once at the end of seed loading.
-- (refresh materialized view is a direct command, not a trigger, so replica
-- mode doesn't block it.)
--   search_text_index — so trigram search has rows to match against.
--   meta_language     — so language lists (browse, chats) are non-empty;
--                       its refresh triggers fire on phrase / user_deck writes.
refresh materialized view "public"."search_text_index";

refresh materialized view "public"."meta_language";
