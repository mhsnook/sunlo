alter table "public"."chat_message" add column "lang" character varying not null;

alter table "public"."chat_message" add constraint "chat_message_lang_fkey" FOREIGN KEY (lang) REFERENCES language(lang) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."chat_message" validate constraint "chat_message_lang_fkey";


