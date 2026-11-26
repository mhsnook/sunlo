-- Keep updated_at current on the realtime-published tables that carry it.
--
-- The client drops a realtime frame whose updated_at is older than the row
-- it holds (writeSyncedRows in src/lib/collections/synced-row.ts), because a
-- frame can arrive after the HTTP response of a later write. That ordering
-- only works if updated_at changes on every write. user_card,
-- request_comment and user_profile set it at insert and never again, so
-- every frame for one row carried the same time.
--
-- user_card_review and user_deck already have their own update triggers.
--
-- clock_timestamp(), not now(): now() is the transaction's start time, so a
-- write that waited on the row lock could stamp a time earlier than the
-- write it waited for. A row trigger fires after the row is locked.
--
-- On insert the given value stands, capped at the server's clock. Seeds keep
-- their dates in the past, and a client clock that runs ahead cannot stamp a
-- time that makes the next update look older.
create or replace function "public"."set_updated_at" () returns "trigger" language "plpgsql" as $$
begin
	if tg_op = 'INSERT' then
		new.updated_at := least(coalesce(new.updated_at, clock_timestamp()), clock_timestamp());
	else
		new.updated_at := clock_timestamp();
	end if;
	return new;
end;
$$;

alter function "public"."set_updated_at" () owner to "postgres";

create or replace trigger "set_updated_at"
before insert or update on "public"."user_card" for each row
execute function "public"."set_updated_at" ();

create or replace trigger "set_updated_at"
before insert or update on "public"."request_comment" for each row
execute function "public"."set_updated_at" ();

create or replace trigger "set_updated_at"
before insert or update on "public"."user_profile" for each row
execute function "public"."set_updated_at" ();

grant all on function "public"."set_updated_at" () to "anon";

grant all on function "public"."set_updated_at" () to "authenticated";

grant all on function "public"."set_updated_at" () to "service_role";
