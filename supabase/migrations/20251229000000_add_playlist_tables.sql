create table if not exists
	"public"."phrase_playlist" (
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"title" "text" not null,
		"description" "text",
		"href" "text",
		"created_at" timestamp with time zone default "now" () not null,
		"lang" character varying not null,
		primary key (id)
	);

alter table "public"."phrase_playlist"
add constraint "phrase_playlist_lang_fkey" foreign key (lang) references public.language (lang) on update cascade on delete set null not valid;
create index if not exists phrase_playlist_uid_idx on public.phrase_playlist (uid);

alter table "public"."phrase_playlist" validate constraint "phrase_playlist_lang_fkey";

create table if not exists
	"public"."playlist_phrase_link" (
		"id" "uuid" default "extensions"."uuid_generate_v4" () not null,
		"uid" "uuid" default "auth"."uid" () not null,
		"phrase_id" "uuid" not null references public.phrase (id) on delete cascade,
		"playlist_id" "uuid" not null references public.phrase_playlist (id) on delete cascade,
		"order" double precision,
		"href" "text",
		"created_at" timestamp with time zone default "now" () not null,
		primary key (id)
	);


create index if not exists playlist_phrase_link_playlist_id_idx on public.playlist_phrase_link (playlist_id);

create index if not exists playlist_phrase_link_phrase_id_idx on public.playlist_phrase_link (phrase_id);

alter table "public"."phrase_playlist" enable row level security;

alter table "public"."playlist_phrase_link" enable row level security;

create policy "Enable read access for all users" on "public"."phrase_playlist" as permissive for
select
	to public using (true);

create policy "Enable read access for all users" on "public"."playlist_phrase_link" as permissive for
select
	to public using (true);

create policy "Enable insert for users based on uid" on "public"."phrase_playlist" as permissive for insert to authenticated
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable insert for users based on uid" on "public"."playlist_phrase_link" as permissive for insert to authenticated
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable update for users based on uid" on "public"."phrase_playlist" as permissive for
update to authenticated using (
	(
		(
			select
				auth.uid () as uid
		) = uid
	)
)
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable update for users based on uid" on "public"."playlist_phrase_link" as permissive for
update to authenticated using (
	(
		(
			select
				auth.uid () as uid
		) = uid
	)
)
with
	check (
		(
			(
				select
					auth.uid () as uid
			) = uid
		)
	);

create policy "Enable delete for users based on uid" on "public"."phrase_playlist" as permissive for delete to authenticated using (
	(
		(
			select
				auth.uid () as uid
		) = uid
	)
);

create policy "Enable delete for users based on uid" on "public"."playlist_phrase_link" as permissive for delete to authenticated using (
	(
		(
			select
				auth.uid () as uid
		) = uid
	)
);