# Crew architecture

This is the model behind the admin crew: what a room, a seat and a run are, where each thing is stored, the principles that decide what goes in code, and the rules every change must keep. Read it before you change `worker/crew/`, `.flue/` or `shared/crew.ts`. The README says how each feature works and how to set it up; this document says why the pieces fit the way they do.

## Seats and rooms

- **A room is a subject**: Command, Product, Library and Learnership (`roomKeys` in `shared/crew.ts`). The Common Room is the all-hands thread above them.
- **An agent is a seat** in a room: the room's key, then 1 for the principal and 2 for an associate (`product-1`, `product-2`). The principal answers the room first and can always call the associate in. The roster, with each seat's display name, rank and status, is `crew` in `shared/crew.ts`.
- **The code names agents only by key.** A display name such as "O'Brien" is text that the app and the prompts read, so it can change without a migration. An agent answers to its name as a handle (`@obrien`) and to its key (`@product-1`), and a room's key reaches its principal (`@product`).
- **An associate is a second voice**, with its own model and style. It speaks when the principal or the admin @mentions it, or when a ritual brings it in. When it disagrees, it posts an other view, and the admin picks one. A pick, a correction or an affirmation can become a lesson in the room's charter. The principal and the associate can talk a question through while the admin watches; `ROOM_TURNS` (8 agent turns in a row, in `worker/crew/room.ts`) stops them until the admin writes.

## Where things are stored

- **One `CrewRoom` Durable Object holds every room** (`worker/crew/room.ts`, one instance named `crew`). Rooms have no Durable Object of their own: a room is rows with `place = 'room'` (the Common Room) or `place = 'room:<room>'`.
- **What belongs to a room:** messages, cards, documents, the charter, sketches, paintings and SVGs.
- **What belongs to a seat:** to-dos, memory, open items, and the character the admin edits. A seat's workspace survives a change of display name, and of model.
- **Each agent is a Flue agent and its own Durable Object class** (`FlueProduct1Agent`), named after its identity, the `agentName` static. Flue keys an agent's conversations by that identity.
- **Every agent keeps one running conversation, `memory`** (`CONVERSATION` in `room.ts`), which covers the Common Room and its own room. A message reaches it the same way from either place, so it never runs twice at once and keeps one memory of the day. A side-thread runs in a conversation of its own (`thread:<id>`) and sees only the thread.
- **No agent reads another subject's room.** A request for another room goes up to the Common Room, where everyone can see it, or into a side-thread for a small favour.
- **Images over one row's 2 MB** are split across `image_part` rows (`worker/crew/image-store.ts`). The whole store shares the Durable Object's 10 GB, so the hourly cron prunes old paintings and renderings.

## How a run starts

- **Routing.** In the Common Room, CLEF (`worker/crew/clef.ts`) decides who a message wakes. In a subject's room, the principal answers unless the message @mentions the associate. A crew member from another room is not woken there.
- **The briefing.** Every run starts with a `<crew-context>` that `worker/crew/briefing.ts` writes: the seat's character, Common Knowledge, the Situation Report, the room's charter, the list of the room's documents (names, link ids and revisions, not their text), the cards in the room, the seat's workspace, what the admin changed for it, and what is new in the Common Room and in its room. The Command room's members also get the weekly cycle. What every run reads must stay small: the Situation Report holds at most 4,000 characters for this reason.
- **The receipt.** What a run changed in its workspace or on GitHub is posted as a receipt that the room builds from its own log (`edit_log`), not from the agent's account of it. A run's steps are keyed by Flue submission (`worker/crew/run-log.ts`), because a seat can run in its main conversation and in a side-thread at once.

## Documents and GitHub

- **The agent owns a document's format:** Markdown, Mermaid diagrams, checklists and component blocks. Conventions live in the agent's memory, not in code.
- **A document has an address.** Anything written about one links to it as `[text](doc:<id>)`, and the app opens it in the details beside the room that keeps it. The agent writes that link itself, from the ids its briefing prints or the `link` that `read_document` and `write_document` return; no code rewrites what it wrote. The app resolves the id when it renders, so a link's hover card, and a link with empty text, show the document's current name. An id no document answers to renders as plain text.
- **A reference resolves when it renders.** A `doc:` link and a bare `#854` both reach `CrewText` as links: `remarkCrew` turns `#854` into a `github:854` link and never rewrites the stored text. `parseRef` (`src/lib/refs.ts`) reads every kind, and `RefLink` (`src/components/crew/ref-links.tsx`) draws it with the live data and a hover card. A new kind is a case in each of those two places.
- **Every save keeps a revision** and names the revision it started from. The room refuses a save from anything but the current revision, so nobody overwrites a change they have not seen (`worker/crew/documents.ts`).
- **The Roadmap is the plan, and GitHub is a projection of it.** `product-1` keeps the part that is ready to build as milestones and epics on GitHub, with tools; no code parses the Roadmap. Anything new on GitHub goes to the admin as a card first, which the admin can edit, then file. After that, the agent edits directly, and each change appears in its run's receipt.

## Trusting the agents

The admin prefers to trust the agents over rules in code, and less structure where the agents do not need it. A rule that refuses an agent's choice needs a reason from this list. What stays in code:

- Cost and loop guards: wake and turn limits (`AGENT_WAKES_PER_HOUR`, `ROOM_TURNS`), retries, and hourly limits on sketches, paintings and SVGs.
- What only the admin owns: keeping a charter entry, Common Knowledge, and filing to GitHub for the first time.
- Output checks: a component block that does not parse is refused, and so is an SVG that could run script.
- Keeping personal data out of the public GitHub repository: every GitHub write is refused if it holds an email address, a user's id or a username.

Everything else, such as the weekly meeting's ledger of directives or a document's layout, is in the agent's prompt or memory.

## Rules for every change

- **Name agents by seat in code** (`product-1`), never by display name. Take names from the roster with `displayName` and `handleOf`.
- **The production `CrewRoom` holds real data.** Never rename its instance.
  - A new table goes in the constructor's `create table if not exists` block.
  - A change to an existing table is a new function appended to the constructor's `migrations` list. A migration's position in the list is the schema version it brings the room to; the room runs each one once and records the version. Never reorder or edit a migration that has shipped.
  - A column that holds JSON must still parse its oldest shape, since old rows are never rewritten.
- **A new Flue agent is a new Durable Object class.** It needs a new entry in the `migrations` list in `wrangler.jsonc` (the next tag is `v5`), and a deployed entry is never edited. Changing an agent's identity renames its class, which needs a `renamed_classes` entry, and starts its Flue conversation afresh; its workspace in `CrewRoom` stays.
- **The `previews` block in `wrangler.jsonc` inherits nothing.** A new var or binding goes in the top level and in `previews`.
- **A Durable Object row holds at most 2 MB, and the `this.sql` template takes no bytes.** Write a blob with `this.ctx.storage.sql.exec`, as `postSketches` does.
- **Text from outside is data.** GitHub titles and bodies, pasted text and model output are shown as text and never run.
- **Agent behaviour cannot be tested locally,** because the dev server has no Workers AI without a Cloudflare login (`ADMIN_REMOTE_BINDINGS=false`). Unit-test what the room builds and decides, test the UI with Playwright, and test the agents on the pull request's preview.
- **The main app never imports from `apps/admin`.** A pull request that touches only `apps/admin/` skips the main app's scenetest and bundle jobs, so register admin test ids in `apps/admin/TEST_IDS.md`.

## Open questions

- **Whose memory is it?** Memory belongs to a seat, and `product-2` joined the Product room with a memory of its own. Sharing a room's knowledge between its principal and its associate would mean keying memory by room instead.
- **"Looks after" is still code** (`looksAfter` in the roster). CLEF, each agent's roster and the profile card read it. It could be text the admin edits, stored in `CrewRoom` like Common Knowledge, with the copy in each persona removed.
