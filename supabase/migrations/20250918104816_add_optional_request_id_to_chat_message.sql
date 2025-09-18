alter table "public"."chat_message" add column "request_id" uuid;

alter table "public"."chat_message" add constraint "chat_message_request_id_fkey" FOREIGN KEY (request_id) REFERENCES phrase_request(id) ON DELETE SET NULL not valid;

alter table "public"."chat_message" validate constraint "chat_message_request_id_fkey";

