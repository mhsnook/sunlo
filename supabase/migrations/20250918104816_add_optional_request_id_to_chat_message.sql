alter table "public"."chat_message"
add column "request_id" uuid;

alter table "public"."chat_message"
add constraint "chat_message_request_id_fkey" foreign key (request_id) references phrase_request (id) on delete set null not valid;

alter table "public"."chat_message" validate constraint "chat_message_request_id_fkey";
