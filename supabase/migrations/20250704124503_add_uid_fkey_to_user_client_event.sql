alter table "public"."user_client_event"
add constraint "user_client_event_uid_fkey" foreign key (uid) references user_profile (uid) on update cascade on delete set null not valid;

alter table "public"."user_client_event" validate constraint "user_client_event_uid_fkey";
