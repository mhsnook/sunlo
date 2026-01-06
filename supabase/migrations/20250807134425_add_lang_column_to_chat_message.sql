alter table "public"."chat_message"
add column "lang" character varying not null;

alter table "public"."chat_message"
add constraint "chat_message_lang_fkey" foreign key (lang) references language (lang) on update cascade on delete set null not valid;

alter table "public"."chat_message" validate constraint "chat_message_lang_fkey";
