# Plan: Real Chat (Instagram-style)

Upgrade the friends chat from a share-only DM feed into a real messaging feature:
text messages, group chats, pictures, voice notes, quoted replies, unsend,
double-tap to like, and typing indicators.

**Where this lives:** all of this is the `src/features/social/` domain (schemas,
collections, hooks) plus routes under `src/routes/_user/friends/`. The
`src/features/chat/` directory is the AI phrasebook-search prototype — unrelated,
do not touch it.

**What exists today (build on it, don't rebuild it):**

- `chat_message` table: `sender_uid` / `recipient_uid` pairs, `message_type` enum
  (`recommendation | accepted | request | playlist`), FK columns for
  phrase/request/playlist previews, an unused `content jsonb` column, `read_at`
  read-tracking, RLS (`are_friends()` gate on insert), and realtime enabled
  (`supabase_realtime` publication).
- `chatMessagesCollection` + `friendSummariesCollection`
  (`src/features/social/collections.ts`), hooks in `social/hooks.ts`
  (`useOneFriendChat`, `useChatEntries`, `useMarkAsRead`, `useSendToFriends`,
  `useSocialRealtime`).
- Chat UI at `src/routes/_user/friends/chats.$friendUid.tsx` + `-chats-sidebar.tsx`:
  bubbles, mark-as-read, scroll-to-bottom, preview cards.
- Image upload precedent: `src/lib/upload-image.ts` (avatars bucket).

**Ground rules for every phase** (implementers: these are repo law, see CLAUDE.md):

- Every phase below touches migrations except 2b/3b/6 UI work — but since the work
  chains, **all PRs go into the open `next-<version>` branch** (cut `next-0.29`
  from `main` if none is open). See `docs/deployment.md`.
- Mutations follow `docs/mutations.md`: persistence in `onInsert/onUpdate/onDelete`
  on the collection, components call `collection.insert/update/delete`, toasts on
  `tx.isPersisted.promise`, **no `collection.utils.refetch()`** — pass
  client-generated ids or `.select()` the row back and return `{ refetch: false }`.
- Realtime payloads are Zod-parsed then `writeInsert`/`writeUpdate`/`writeDelete`
  into the collection (existing pattern in `useSocialRealtime`).
- New user collections: `startSync: false`, RLS scopes the fetch, and they must be
  registered in `src/lib/auth-lifecycle.ts` for clearing on sign-out.
- After each migration: `supabase db reset`, `pnpm run types`, `pnpm check`,
  `pnpm lint`. New tests are scenetest markdown scenes; register new
  `data-testid`s in `scenetest/TEST_IDS.md`.

---

## Phase 1 — Conversation model (rooms + members)

The foundation everything else needs. Replaces the implicit "conversation =
sender/recipient pair" with explicit rooms, so groups, per-member read state, and
membership-based RLS all have a home. **Ships as a parity release: no new UX,
existing chats keep working.**

### Migration

```sql
create table public.chat_room (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references user_profile(uid) on delete cascade,
  room_type text not null check (room_type in ('dm', 'group')),
  title text,          -- null for DMs; required for groups (enforce in RPC)
  lang text            -- optional default language, mirrors chat_message.lang convention
);

create table public.chat_member (
  room_id uuid not null references chat_room(id) on delete cascade,
  uid uuid not null references user_profile(uid) on delete cascade,
  created_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (room_id, uid)
);
```

- `is_room_member(room uuid, who uuid) returns boolean` — `security definer` SQL
  function (mirrors `are_friends()`), used by all policies below **and** by the
  `chat_member` select policy itself to avoid RLS recursion.
- `alter table chat_message add column room_id uuid references chat_room(id) on delete cascade;`
- **Backfill:** one `dm` room per distinct unordered `(sender_uid, recipient_uid)`
  pair in `chat_message`, two `chat_member` rows each with
  `last_read_at = coalesce(max(read_at) they've read, now())`, then set
  `chat_message.room_id not null`.
- `recipient_uid` becomes nullable and stops being written (drop it in a later
  cleanup migration, don't block on it). Drop the `read_at` column and its
  policy/index — `chat_member.last_read_at` replaces it.
- **New RLS:** select on `chat_room`/`chat_member`/`chat_message` via
  `is_room_member(room_id, auth.uid())`; insert on `chat_message` requires sender
  is a member; update on `chat_member` self-row only (for `last_read_at`). Drop
  the old sender/recipient select policy.
- **RPCs** (both `security definer`, both return the room + member rows as json so
  the client can `writeInsert` without refetching):
  - `get_or_create_dm_room(friend uuid)` — requires `are_friends()`; idempotent.
  - `create_group_room(title text, member_uids uuid[])` — requires every member is
    a friend of the creator; caps members at ~32.
- Add `chat_room` and `chat_member` to the `supabase_realtime` publication.

### Client

- New Zod schemas `ChatRoomSchema`, `ChatMemberSchema`; new collections
  `chatRoomsCollection` (getKey: `id`), `chatMembersCollection`
  (getKey: `` `${room_id}--${uid}` `` — composite PK). Register both in
  `auth-lifecycle.ts`.
- `ChatMessageSchema` gains `room_id`; `recipient_uid` becomes nullable.
- Rework hooks around rooms: `useOneRoomChat(roomId)`, `useChatEntries()` keyed by
  room (join room → members → profiles → last message in live queries), unread =
  messages with `created_at > my last_read_at && sender_uid !== me`.
  `useMarkAsRead` becomes an update of my `chat_member.last_read_at` via
  `chatMembersCollection.update` (single-row optimistic update — much simpler than
  today's batch write).
- Route becomes `/_user/friends/chats/$roomId`. The profile-page / share-sheet
  entry points call `get_or_create_dm_room` and navigate to the returned room.
  `useSendToFriends` inserts into the friend's DM room (creating it via the RPC if
  needed).
- `useSocialRealtime` subscribes to `chat_room` + `chat_member` inserts too (being
  added to a group must make it appear live).

### Acceptance

- [ ] `supabase db reset` succeeds; pre-existing seeded messages appear in the
      right DM rooms with correct unread counts.
- [ ] Sidebar, DM view, share-a-phrase/playlist/request flows, unread badges, and
      mark-as-read all behave exactly as before (existing scenetest chat scenes
      pass, updated only for the `$roomId` param).
- [ ] A non-member selecting from `chat_message`/`chat_room`/`chat_member` for a
      room they're not in gets zero rows (assert via a second scenetest actor).
- [ ] No `collection.utils.refetch()` added; `pnpm check` and `pnpm lint` pass.

---

## Phase 2 — Text messages

The core upgrade: typing an actual message.

### Migration

- `alter type chat_message_type add value 'text';` (follow the existing
  `add_request_to_chat_message_type` migration pattern).
- `alter table chat_message add column body text;` check constraint:
  `message_type = 'text'` requires non-empty `body` (≤ 2000 chars).

### Client

- Wire `onInsert` onto `chatMessagesCollection` (persist via
  `.insert(...).select()`, return `{ refetch: false }`; generate the message `id`
  client-side so optimistic === synced). Migrate `useSendToFriends`'s direct
  supabase insert onto this handler while you're there.
- Composer replaces the fake link-styled input at the bottom of the chat route:
  a real `<Input>` + send button (`useAppForm` is overkill here; a controlled
  input is fine), Enter to send, keep the existing "recommend" flow reachable via
  a `+` button beside it.
- Instagram-style bubbles for `text` messages: own messages end-aligned in a
  filled bubble, friend's start-aligned in a muted bubble (reuse the existing
  `isMine` layout; luminance-step tokens, no `dark:`), `rounded-2xl`, timestamps
  on a long-press/click detail rather than on every bubble.

### Acceptance

- [ ] Send a text message: it appears instantly (optimistic), survives reload,
      and arrives live in the other actor's open chat (two-actor scenetest scene).
- [ ] Sending updates the sidebar's last-message preview + unread count for the
      recipient; empty/whitespace messages are not sendable.
- [ ] On server rejection (e.g. not a member) the bubble rolls back and an error
      toast shows.
- [ ] Message composer has a registered `data-testid` (e.g. `chat-composer-input`,
      `chat-send-button`).

---

## Phase 3 — Replies, likes, unsend

The interaction layer. One migration, three small features.

### Migration

- `alter table chat_message add column reply_to_message_id uuid references chat_message(id) on delete set null;`
  (leave `related_message_id` alone — it's the legacy recommendation→accepted link).
- `alter table chat_message add column deleted_at timestamptz;` — unsend is a
  soft delete. New update policy: **sender only**, and (via trigger or `with check`)
  only allow setting `deleted_at` / nulling `body`+`media_path` — no editing.
- `create table chat_message_like (message_id uuid references chat_message(id) on delete cascade, uid uuid not null default auth.uid() references user_profile(uid) on delete cascade, created_at timestamptz not null default now(), primary key (message_id, uid));`
  RLS: select/insert/delete for room members (join through `chat_message` →
  `is_room_member`), insert/delete only own row. Add to realtime publication.

### Client

- `chatMessageLikesCollection` (getKey: `` `${message_id}--${uid}` ``), with
  `onInsert`/`onDelete`; register in `auth-lifecycle.ts`; realtime
  INSERT/DELETE → `writeInsert`/`writeDelete`.
- **Double-tap to like:** double-click / double-tap on a bubble toggles my like.
  Render a small ❤️ badge with count on the bubble corner when liked. (Just the
  heart — no emoji picker.)
- **Quoted replies:** swipe-right (touch) or a hover/long-press "Reply" action sets
  reply state above the composer (with an ✕ to cancel); sent message carries
  `reply_to_message_id`; the bubble renders a compact quote of the original
  (sender name + truncated body / "Photo" / "Voice note") that scrolls to the
  original on click.
- **Unsend:** long-press/hover menu on own messages → "Unsend" → collection
  `update` setting `deleted_at` + nulling `body`/`media_path` (and deleting the
  storage object if any, once Phase 4 lands). Deleted messages disappear from the
  thread entirely (Instagram-style); a quote pointing at one renders
  "Message unsent". Realtime UPDATE events → `writeUpdate` so the other side sees
  it vanish live.

### Acceptance

- [ ] Double-tap likes and un-likes optimistically; the other actor sees the heart
      appear live; likes survive reload.
- [ ] Reply flow: quote renders correctly for text and (later) media messages;
      tapping the quote scrolls to the original; replying to an unsent message
      shows "Message unsent" in the quote.
- [ ] Unsend removes the bubble on both actors' screens without reload; the row's
      `body` is null in the DB; recipients cannot unsend others' messages (RLS
      denies — assert).
- [ ] Sidebar preview of an unsent last message shows "Message unsent", not stale
      text.

---

## Phase 4 — Pictures & voice notes

### Migration

- `alter type chat_message_type add value 'image'; ... add value 'voice';`
- `alter table chat_message add column media_path text;` — metadata (duration,
  width/height, mime) goes in the **existing `content jsonb` column**; add an
  optional `content` object to `ChatMessageSchema`.
- Private storage bucket `chat-media`. Object paths are `{room_id}/{message_id}.{ext}`;
  storage RLS: insert requires `is_room_member((storage.foldername(name))[1]::uuid, auth.uid())`,
  select same, delete owner-only.

### Client

- **Pictures:** paperclip/image button in the composer → file input (accept
  images, cap ~5 MB) → upload to `chat-media` (adapt `src/lib/upload-image.ts`'s
  pattern, don't reuse the avatars bucket) → insert message
  (`message_type: 'image'`, `media_path`, optional `body` as caption). Render as
  a rounded image in the bubble via a signed URL (`createSignedUrl`, ~1 h expiry,
  cached per path in the component layer); click opens full-size.
- **Voice notes:** mic button → `MediaRecorder` (`audio/webm;codecs=opus`, fall
  back to `audio/mp4` for Safari), cap 2 minutes, show elapsed time + cancel
  while recording → upload → message with `content: { duration_seconds }`.
  Render as play/pause + duration (a plain `<audio>` element behind a styled
  button is fine — no waveform).
- Optimistic UX: show the bubble in an "uploading" state (local object URL) while
  the storage upload runs, then do the collection insert; on upload failure show
  retry/discard, never a phantom message.
- Sidebar previews: "📷 Photo" / "🎤 Voice note".

### Acceptance

- [ ] Send a picture and a voice note in a DM; both render for the other actor
      live and after reload; voice note plays with correct duration.
- [ ] A non-member cannot fetch the object (signed-URL creation or storage RLS
      denies — assert with second actor).
- [ ] Unsend on a media message removes the storage object and the bubble.
- [ ] Oversized file / >2 min recording is blocked client-side with a clear toast.

---

## Phase 5 — Group chats (UI)

Schema shipped in Phase 1; this is the surface.

### Client (no migration expected)

- "New group" action in the chats sidebar → picker of friends (reuse the
  multi-select from `useSendToFriends`'s share sheet) + group name →
  `create_group_room` RPC → `writeInsert` returned rows → navigate to the room.
- Group chat header: title + stacked member avatars; header click opens a member
  list sheet (with "leave group": delete own `chat_member` row via collection —
  RLS delete policy for own row; add it in Phase 1 or a small migration here).
- Bubbles in groups show the sender's avatar + username on the start-aligned side
  (DMs keep the current avatar-only treatment).
- Everything from Phases 2–4 (text, likes, replies, unsend, media, read state)
  must already work in group rooms by construction — this phase mostly proves it.

### Acceptance

- [ ] Create a 3-person group; all three actors see the room appear live in the
      sidebar and can send/receive text, likes, replies, and media in it.
- [ ] Unread counts are per-member (actor B reading doesn't clear actor C's badge).
- [ ] A member who leaves stops receiving the room's messages (row-level: fetch
      returns nothing new; realtime events no longer render) and the room drops
      from their sidebar.
- [ ] Non-friends of the creator can't be added (RPC errors, toast shown).

---

## Phase 6 — Typing indicators

Ephemeral, no table. Uses Supabase Realtime **broadcast** on a private channel.

### Migration

- Realtime authorization policy on `realtime.messages` so only room members can
  join `room:{room_id}` broadcast channels (`select`/`insert` policies using
  `is_room_member(...)` against `realtime.topic()`).

### Client

- In the open chat route: join channel `room:{roomId}` with
  `config: { private: true }`. While the composer has input, broadcast a `typing`
  event at most every 2 s; listeners show "{username} is typing…" (with the
  little animated dots, under the header or above the composer) and clear it 3 s
  after the last event or when a message from that user arrives. In groups, show
  up to two names ("+ others").
- Keep it out of collections/zustand — local component state in the chat route is
  correct here.

### Acceptance

- [ ] Actor A types → actor B (with the chat open) sees the indicator within ~1 s;
      it disappears ~3 s after A stops or when A's message arrives.
- [ ] Own typing never shows to self; indicator never appears in the sidebar list
      (chat view only — deliberate scope cut).
- [ ] A non-member cannot subscribe to the room's broadcast channel.

---

## Explicit scope cuts (don't build these)

Read receipts / "seen" avatars per message, message editing, emoji reactions
beyond ❤️, link previews, video, message search, notifications-integration
changes beyond the existing unread badge, and E2E encryption. If any feels
necessary mid-build, flag it instead of building it.

## Suggested PR sequence

Phase 1 is the big one and must land (and be QA'd against seeded data) before
anything else starts. Phases 2 → 3 → 4 chain. Phase 5 and 6 are independent of 4
and of each other, so they can parallelize after Phase 3. Each phase is one PR
into the open `next-<version>` branch, each with its scenetest scene(s) and any
new seed data needed to exercise it.
