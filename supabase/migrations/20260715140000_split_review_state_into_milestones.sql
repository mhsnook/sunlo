-- Split the mutable review-session progress out of user_deck_review_state (#723).
--
-- user_deck_review_state carried an immutable `manifest` (written once at
-- session creation, and the FK target for user_card_review) alongside a mutable
-- `stage` bumped repeatedly during a session. Every stage tick re-broadcast the
-- whole manifest over realtime, and two devices mid-session did whole-row
-- last-write-wins.
--
-- After this migration the session row is immutable (manifest only, INSERT-only
-- over realtime) and progress lives in an append-only `review_milestone` log.
-- Current stage = the `stage` of the latest milestone per session.
-- Append-only milestone log. One row per session event; never updated.
create table review_milestone (
	id uuid default gen_random_uuid() not null primary key,
	uid uuid default auth.uid () not null,
	lang character varying not null,
	day_session date not null,
	created_at timestamp with time zone default now() not null,
	event text not null,
	-- The session stage this milestone records (mirrors the old
	-- user_deck_review_state.stage numbering: 0..5). Non-null for every event
	-- we emit today, so the fold "latest milestone's stage" is total.
	stage smallint,
	constraint review_milestone_event_check check (event = any (array['session_started', 'stage_advanced', 'session_completed'])),
	constraint review_milestone_stage_check check (
		stage is null
		or (
			stage >= 0
			and stage <= 5
		)
	),
	-- A milestone can't dangle without its session; cascade when the session goes.
	constraint review_milestone_session_fkey foreign key (uid, lang, day_session) references user_deck_review_state (uid, lang, day_session) on update cascade on delete cascade
);

-- Fold lookup: latest milestone per session.
create index idx_review_milestone_session_created on review_milestone (uid, lang, day_session, created_at desc);

-- RLS: a subscriber sees and appends only their own milestones. Append-only,
-- so no update/delete policy.
alter table review_milestone enable row level security;

create policy "Enable users to view their own data only" on review_milestone for
select
	to authenticated using (uid = auth.uid ());

create policy "Enable insert for authenticated users only" on review_milestone for insert to authenticated
with
	check (uid = auth.uid ());

grant
select
,
	insert on review_milestone to authenticated;

-- Stream milestones over realtime (RLS-scoped per subscriber).
alter publication supabase_realtime
add table review_milestone;

-- Backfill: give every existing session a single milestone carrying its current
-- stage, so the "latest milestone's stage" fold reproduces today's value.
-- Historical intermediate transitions were never recorded (stage was mutable).
insert into
	review_milestone (uid, lang, day_session, created_at, event, stage)
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
	user_deck_review_state;

-- The session row is now immutable; drop the mutable column.
alter table user_deck_review_state
drop column stage;
