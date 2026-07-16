-- Split the mutable review-session progress out of user_review_session (#723).
--
-- user_review_session carried an immutable `manifest` (written once at
-- session creation, and the FK target for user_card_review) alongside a mutable
-- `stage` bumped repeatedly during a session. Every stage tick re-broadcast the
-- whole manifest over realtime, and two devices mid-session did whole-row
-- last-write-wins.
--
-- After this migration the session row is immutable (manifest only, INSERT-only
-- over realtime) and progress lives in an append-only `user_review_milestone` log.
-- Current stage = the `stage` of the latest milestone per session.
-- Rename the session table to reflect what it now is: an immutable session
-- record (manifest + FK anchor), no longer a bag of mutable state. FKs,
-- indexes and policies follow the table automatically; rename the two
-- constraints that still carry the old table name for tidiness.
alter table user_deck_review_state
rename to user_review_session;

alter table user_review_session
rename constraint user_deck_review_state_pkey to user_review_session_pkey;

alter table user_review_session
rename constraint user_deck_review_state_lang_uid_fkey to user_review_session_lang_uid_fkey;

-- Append-only milestone log. One row per session event; never updated.
create table user_review_milestone (
	id uuid default gen_random_uuid() not null primary key,
	uid uuid default auth.uid () not null,
	lang character varying not null,
	day_session date not null,
	created_at timestamp with time zone default now() not null,
	event text not null,
	-- The session stage this milestone records (mirrors the old
	-- user_review_session.stage numbering: 0..5). Non-null for every event
	-- we emit today, so the fold "latest milestone's stage" is total.
	stage smallint,
	constraint user_review_milestone_event_check check (event = any (array['session_started', 'stage_advanced', 'session_completed'])),
	constraint user_review_milestone_stage_check check (
		stage is null
		or (
			stage >= 0
			and stage <= 5
		)
	),
	-- A milestone can't dangle without its session; cascade when the session goes.
	constraint user_review_milestone_session_fkey foreign key (uid, lang, day_session) references user_review_session (uid, lang, day_session) on update cascade on delete cascade
);

-- Fold lookup: latest milestone per session.
create index idx_user_review_milestone_session_created on user_review_milestone (uid, lang, day_session, created_at desc);

-- RLS: a subscriber sees and appends only their own milestones. Append-only,
-- so no update/delete policy.
alter table user_review_milestone enable row level security;

create policy "Enable users to view their own data only" on user_review_milestone for
select
	to authenticated using (uid = auth.uid ());

create policy "Enable insert for authenticated users only" on user_review_milestone for insert to authenticated
with
	check (uid = auth.uid ());

grant
select
,
	insert on user_review_milestone to authenticated;

-- Stream milestones over realtime (RLS-scoped per subscriber).
alter publication supabase_realtime
add table user_review_milestone;

-- Backfill: give every existing session a single milestone carrying its current
-- stage, so the "latest milestone's stage" fold reproduces today's value.
-- Historical intermediate transitions were never recorded (stage was mutable).
insert into
	user_review_milestone (uid, lang, day_session, created_at, event, stage)
select
	uid,
	lang,
	day_session,
	created_at,
	case
		when stage >= 5 then 'session_completed'
		when stage <= 1 then 'session_started'
		else 'stage_advanced'
	end,
	stage
from
	user_review_session;

-- The session row is now immutable; drop the mutable column.
alter table user_review_session
drop column stage;
