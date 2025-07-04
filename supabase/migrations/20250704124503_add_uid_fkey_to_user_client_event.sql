alter table "public"."user_client_event" add constraint "user_client_event_uid_fkey" FOREIGN KEY (uid) REFERENCES user_profile(uid) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."user_client_event" validate constraint "user_client_event_uid_fkey";


