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
-- the statement-level triggers that keep search_text_index in step with
-- source-table writes. Refresh the MV once at the end of seed loading so
-- trigram search has rows to match against. (refresh materialized view
-- is a direct command, not a trigger, so replica mode doesn't block it.)
refresh materialized view "public"."search_text_index";
