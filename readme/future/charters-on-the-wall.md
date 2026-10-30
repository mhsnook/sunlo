# Charters go on the wall

A charter belongs to a room. The Common Room's charter is what the code calls
Common Knowledge, and every other room's charter builds on it. This plan makes
the data and the UI say that, and gives every room the same "Details" panel.
It is written as a prompt for an agent already working in the admin's data and
content management; the cosmetic rename that preceded it is done (the panel
in the Common Room is labelled "Charter").

## What exists today

| Thing                                     | Scope                   | Who writes it                             | Where it lives                                                |
| ----------------------------------------- | ----------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Rooms, seats, titles, looks after         | fixed                   | the admin, in `apps/admin/shared/crew.ts` | code                                                          |
| Character                                 | every agent             | the admin                                 | the agent's workspace                                         |
| Charter                                   | every room              | agents propose, the admin keeps or drops  | `charter` rows keyed by room (`worker/crew/room.ts`)          |
| Common Knowledge                          | one, global             | the admin only                            | its own rows and API (`crew/knowledge`)                       |
| Documents                                 | every room              | the room's agents and the admin           | `document` rows keyed by room; `startingDocuments` seeds them |
| Situation Report                          | one, a Command document | Riker and the admin; every agent reads it | a Command room document                                       |
| To-dos, memory, open items, waiting cards | every agent             | the agent; the admin can edit             | the agent's workspace                                         |
| Overview                                  | Common Room only        | nobody; it is SQL in the Worker           | code (`overview-panel.tsx`, `activityOverviewQuery`)          |
| Weekly settings                           | Command room only       | the admin                                 | code plus a stored timezone                                   |

Two asymmetries follow. The Common Room is not a room in `roomKeys`: it has no
charter rows and no documents, so its three header panels (Situation Report,
Charter, Overview) are each a special case. And the Overview is the only
room-specific view built in code, where a document with `stats` and `chart`
blocks would do.

## The change

### 1. Common Knowledge becomes the Common Room's charter

- Give the Common Room a charter like any other room's: `charter` rows with a
  room key for it (the place key `room`, or a new `crew` key; pick what the
  `PlaceSchema` and `roomOfPlace` already distinguish). Migrate the
  `common_knowledge` rows into it as kept entries of kind `principle`.
- Every room's briefing reads the Common Room's charter first, then its own,
  which is what `briefing.ts` does today with Common Knowledge, so the order
  of what an agent reads does not change. Keep the rule that no agent saves a
  memory about how to address the admin.
- `propose_charter` from a Common Room post, if a principal ever proposes
  there, lands on the Common Room's charter.
- Delete the `crew/knowledge` API, `commonKnowledgeQuery` and its three
  mutations, the `common-knowledge` socket event, and
  `common-knowledge-panel.tsx`. The Common Room renders `CharterPanel` for its
  own key. Rename the test ids to `charter-*` and update
  `apps/admin/TEST_IDS.md`.
- Update every prompt and doc that says "Common Knowledge": the agents'
  character files in `apps/admin/.flue/agents/`, `briefing.ts`, the tool
  descriptions in `apps/admin/.flue/tools/crew.ts`, and `apps/admin/README.md`.

### 2. One Details panel for every room

- One "Details" button on every room header, including the Common Room, which
  opens one panel. The same sections in the same order, each present only
  where it applies:
  1. Documents. The Situation Report is pinned first in every room's list,
     since every agent reads it; it opens read-only outside the Command room.
  2. Charter. The Common Room's is the crew's.
  3. Members, each with looks after, character, to-dos, open items and memory.
     The Common Room lists every agent.
  4. The room's own settings, labelled as settings: Weekly settings in the
     Command room.
- On a wide screen the panel stays beside the timeline as `SidePanel` does
  now. On a phone it covers the room, with the sections as an accordion:
  documents open, the rest folded.
- The open section, and an open document, go in the URL as search params, so
  the back button closes them and a message can link to a document.
- This retires the Common Room's three header buttons and the panels menu in
  `routes/_admin/index.tsx` (#831, which can be closed unmerged if it has not
  been).

### 3. The Overview becomes a document

- Data (`command-2`) writes a "This week's numbers" document in the Command
  room on its schedule, with `stats` and `chart` blocks, from the same queries
  the Overview runs. The raw dashboard stays at `/activity`.
- Delete `overview-panel.tsx` and `activityOverviewQuery` once the document
  has run for a week.
- Add a block kind to `apps/admin/shared/blocks.ts` only when a document needs
  one the renderer lacks.

## Done looks like

- `grep -ri "common knowledge" apps/admin` finds only the migration.
- Every room header has one Details button and no other panel buttons.
- A phone shows the Details panel as a page with an accordion, and the back
  button closes it.
- The Command room has a "This week's numbers" document that an agent keeps.
