# Sunlo Admin

The team dashboard at `admin.sunlo.app`. It is a separate Vite app that shares the main app's Supabase project, types and UI components, and deploys on its own to Cloudflare as the `sunlo-admin` Worker, which serves the app's static files and its `/api`.

## Sign-in

Admins sign in with their normal Sunlo email and password. The admin app keeps its own session, because the browser stores a Supabase session per origin, so signing in on `sunlo.app` does not sign you in here.

Any Sunlo account can sign in, but only accounts listed in `public.admin_user` see the dashboard. The Worker checks that table itself on every `/api` request, so the UI check is a convenience, not the security boundary. To add an admin:

```sql
insert into public.admin_user (uid) values ('<the user uuid>');
```

## On a phone

The admin app installs to a home screen: Chrome offers "Install app" from the menu, and Safari has "Add to Home Screen". That comes from `public/manifest.webmanifest` and the icons beside it, which `index.html` links; there is no service worker, since every screen is a live socket to the crew room and a cache would only serve stale builds. The icons are the main app's characters in a purple frame with a gear badge, which `scripts/make-icons.py` builds from the root `public/app-icon.png` (it needs Pillow); rerun it if that icon changes:

```bash
python3 apps/admin/scripts/make-icons.py public/app-icon.png apps/admin/public
```

## How data flows

The dashboard's numbers come from `worker/`, a [Hono](https://hono.dev) app that runs SQL against the database as `admin_reader`, a read-only Postgres role (`supabase/migrations/20261023120000_admin_reader_role.sql`). A new chart is a new query in `worker/stats.ts` and a Zod schema in `src/lib/stats.ts`, not a migration.

1. The app calls `GET /api/activity-overview?days=7` or `GET /api/user-activity?days=7&limit=20` on its own origin, with `Authorization: Bearer <access token>` from the admin's Supabase session.
2. The Worker verifies the token with `supabase.auth.getClaims()` and requires `role = 'authenticated'`, so the public anon key gets a 401.
3. It connects as `admin_reader` with [postgres.js](https://github.com/porsager/postgres) through Hyperdrive ("Deploying", below), and checks `public.admin_user` for the token's user. Anyone else gets a 403.
4. It runs the query and returns one JSON object, which the app parses with the Zod schemas in `src/lib/stats.ts`.

`admin_reader` has `bypassrls`, so it counts across every user's rows, and `default_transaction_read_only`, so it cannot write through any path. It reads every public table except these:

| Table               | admin_reader sees                 | Hidden                                   |
| ------------------- | --------------------------------- | ---------------------------------------- |
| `chat_message`      | `id`, `sender_uid`, `created_at`  | the message, who received it, read state |
| `notification`      | `id`, `uid`, `type`, `created_at` | who acted and on what                    |
| `user_client_event` | `id`, `uid`, `created_at`         | error messages, context and URLs         |
| `db_meta`           | nothing                           | everything                               |
| `auth.*`            | nothing directly                  | passwords, tokens, identities            |

It reads `auth.users` only through the view `admin.user_account`, which exposes `id`, `email`, `created_at` and `last_sign_in_at`. The view exists because the role that runs migrations does not own `auth.users` and cannot grant on it; a view it owns reads the table on `admin_reader`'s behalf. The `admin` schema is not in PostgREST's exposed schemas, so the API never serves it.

Writes, when the admin app gets them, go through the admin's own Supabase session and RLS, so the row history names a person. `admin_reader` never writes, and nothing here uses the service-role key.

## The crew

The dashboard opens on the **Common Room**: a group chat between you and AI agents named for their jobs. Each agent posts when it runs, and @mentions the others. The whole crew reads it, so it is the all-hands overview.

**Common Knowledge**, the panel labelled "Charter" in the Common Room, holds the few things every agent should always know about you, such as your name and how to refer to you. It is the crew's charter, which each room's charter builds on; the code and the API keep the older name. You write it; every agent reads it at the top of every run, and is told never to save memories of its own about how to address you.

**The Situation Report**, first among the documents in every room's details, is the Command room's document on where Sunlo and each room stand now. Riker keeps it, and you edit it there; every agent reads all of it after Common Knowledge, and an officer whose subject it describes wrong tells Riker. It holds at most 4,000 characters, since every run reads all of it.

**Voice.** Every compose bar has a mic: press it, talk, and press it again, and what you said lands in the draft for you to read before sending. The speaker button beside it turns on voice replies, which reads each new reply aloud in the agent's own voice as it arrives. Any agent message also has its own read-aloud button. The Worker does both with Workers AI: Deepgram Nova 3 for speech to text and Aura 2 for text to speech (`worker/voice.ts`).

**Images.** Every compose bar takes images: paste one, drop one on the bar, or pick one with the image button. The app scales each image down in the browser, to at most 2,000 px on its long side and under 1.8 MB (a PNG source stays a PNG if it fits at full size; otherwise a JPEG), and shows it as a thumbnail you can remove before you send. A message holds at most 6 images, with or without text. The timeline shows a sent message's images as thumbnails, and a click opens one full size. A paste that holds text as well as an image, such as cells copied from a spreadsheet, pastes the text only. If a send fails, the images that went up stay up, and the next send uses them again. An agent reads a line for each image after the message's text, such as `[image 12 attached, 1280×800]`, wherever the text reaches it (the message that wakes it, its briefing and `read_room`), and an agent whose model takes images looks at one with `look_at_image` ("Images", below).

### Rooms

Each **room** is a subject, at `/room/<room>`, where you talk with the officers who work on it and anything that needs you arrives as a card. Its **principal** runs it and answers it first. A room can also have an **associate**, a second, more thorough voice that the principal can always call on: Data works with Riker in the Command room, and Keiko with O'Brien in the Product room. The sidebar lists the Common Room, then the four rooms, each with a count of unread messages and a count of the cards that wait on you.

| Room             | Principal                | Associate           | Job                     | Status                                                 |
| ---------------- | ------------------------ | ------------------- | ----------------------- | ------------------------------------------------------ |
| Command room     | Cmdr Riker (`command-1`) | Data (`command-2`)  | First officer           | Runs: weekly brief on Sunday at 04:00, and when called |
| Product room     | O'Brien (`product-1`)    | Keiko (`product-2`) | Product manager; design | Runs: daily at 07:00 UTC, and when called              |
| Library room     | Hoshi (`library-1`)      |                     | Learning content        | Planned                                                |
| Learnership room | Guinan (`learnership-1`) |                     | Growth and retention    | Planned                                                |

The roster lives in `shared/crew.ts`: each room's key, and each officer's key, name, rank, room and role (`principal` or `associate`). An officer's key is its seat: the room, then 1 for the principal and 2 for an associate. The code names agents only by key; the names are display text for the app and the prompts, so a name can change without a migration. An officer answers to its name as a handle (@data) and to its key (@command-2). A room's key is a handle too: @product reaches whoever runs the Product room. A planned officer has a place in its room, and what you write there waits until it starts.

In a room, what you write goes to the principal unless you @mention the associate. A crew member from another room is not woken there: the principal takes the request to the Common Room, where everyone can see it. When the principal and the associate talk a question through, you can watch and interject; they take at most 8 turns in a row before you speak.

The **details** beside the thread (the Details button in the header) hold the room's documents, its charter and each member's profile card, character, to-dos, what is open with you, and memory. The Command room's details also hold the weekly settings and Data's playbook. You can change all of it there:

- **Character**: who the officer is and how it works, the persona its every run starts from. Edit it, or restore the original. The default text lives in code (`shared/characters.ts`); your version lives in the room (`character` table) and wins while it exists. An agent module cannot wait on the room, so the persona reaches the agent as the first section of its `<crew-context>`, "Who you are", not as its system prompt.
- **Memory and to-dos**: add, edit, delete, and tick to-dos done.
- **Open with you**: rename an item, or close it.
- **Charter**: write an entry, which is kept at once, or edit and drop one.

The agent hears about each of these changes at the start of its next run ("What the admin changed for you", from the `admin_change` table), so it knows why its workspace looks different. Charter changes need no notice, because every briefing carries the room's whole charter.

Every agent keeps one Flue conversation, `memory` (`CONVERSATION` in `worker/crew/room.ts`), which covers the Common Room and its own room. A message reaches it the same way from either place, so it never runs twice at once and keeps one memory of the day. No agent reads another subject's room.

What needs you arrives in the room as a card:

- **Decide**: your call, and the matter is on hold until you answer.
- **Confirm**: the agent acted in your stead, on a reversible matter that a kept charter entry or an earlier answer of yours covers, and asks whether that was right.
- **Escalate**: it needs more than the crew has, with a brief you could hand to a Claude Code session.
- **Worth knowing**: nothing to answer.
- **Change to the plan**: a change an officer proposes. "Do it" saves the decision to its memory and adds a to-do; "Not yet" saves that to memory.

Every card can also be dismissed, with or without a line of feedback. The agent hears why, and feedback becomes one of its memories, so it learns what you do not want.

### Every room's charter, and second views

Each room keeps a **charter**: the admin's principles (philosophy, strategy, taste) and lessons (how they decide), which the room's officers propose with `propose_charter` and which count only once you keep them. It shows in the room's details, and every run in the room reads its kept entries.

When a room's principal asks its associate in, and the associate sees it differently, the associate posts with `otherView` set. The app folds that answer under the principal's message that asked ("Keiko sees it differently"), and once you open it, you go with one of the two. Both agents hear which, and the principal is asked whether the pick belongs in the charter. Keiko (`product-2`) is the Product room's design associate; the principal brings it in for choices about what someone sees or does, and for a design review before user-facing work becomes an epic.

### Keiko's sketches

Keiko's main job is to reimagine screens. Ask in the Product room, such as "@keiko the review screen is a mess", and Keiko looks at the screen, then posts a **sketches** card: usually three mockups that differ on purpose (a faithful cleanup, a bold reimagining and an off-the-wall idea), each with a one-line idea. Each mockup has Copy image, Download and Copy brief (its idea and HTML), for pasting into a GitHub issue or a Claude Code session. "Go with A" picks one, and Keiko and O'Brien both hear which.

- `look_at_screen` screenshots a page of the app (a path on `SUNLO_URL`, or any URL, such as a pull request's preview) or one of Keiko's sketches, in a phone (390×844) or desktop (1440×900) frame, and passes the pictures to Keiko's model in a `harness.prompt`, because a Flue tool result reaches the model only as text. The browser is signed out, so for a screen behind sign-in Keiko asks you to paste a screenshot, and looks at it with `look_at_image`.
- `sketch_screens` takes up to four whole HTML documents that Keiko writes, renders each with [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) (the `BROWSER` binding, through `@cloudflare/puppeteer`), and posts the card. The room keeps each picture and its HTML in its `sketch` table, served at `/api/crew/sketches/:id` and `/api/crew/sketches/:id/image`. Keiko can make 12 sketches an hour (`SKETCHES_PER_HOUR`).
- `read_sketch` returns a sketch's HTML, to draw the next version from it.
- Keiko mounts [Impeccable](https://github.com/pbakaus/impeccable)'s design skill with Flue's `useSkill`: its references load only when Keiko activates the skill or reads one. The skill is copied unchanged from upstream v4.8.0 (`plugin/skills/impeccable`, without its `scripts/` command-line tools) into `.flue/skills/impeccable/`, with its Apache-2.0 `LICENSE` and `NOTICE.md`. oxfmt skips it (`.prettierignore`), so it stays as published.

Keiko runs on Claude Opus 5.5 through Workers AI (`MODEL_PRODUCT_2`), with no Anthropic API key: Flue sends `anthropic/…` ids over the `AI` binding in Anthropic's message format. The id is pi-ai's, `anthropic/claude-opus-5-5`, because Flue only knows a model's image input and context window from pi-ai's catalog; Cloudflare's catalog writes it `anthropic/claude-opus-5.5`. It costs $4 per million input tokens and $20 per million output tokens.

Locally, Browser Rendering starts a Chrome that miniflare downloads. As root, as in a container, Chrome needs `--no-sandbox`, which miniflare adds when `CI` is set: `CI=1 pnpm admin:dev`.

### Keiko's painter

Sketches stay close to what can be built. To find ideas that are not generic, Keiko first has them painted: she writes a tight brief, and image models paint it in up to four very different styles, each as dramatically as the style allows. The paintings come back over the top on purpose. You and O'Brien take what you like from them; Keiko looks at them with `look_at_image`, takes the parts that work and redraws them within Sunlo's brand with `sketch_screens`. Her persona (`shared/characters.ts`) holds this loop, and asks her to keep what you liked in the Design document and her memory and to use it when she writes briefs and picks styles. The painter is a plain model call per style with a prompt the Worker builds, not an agent.

- `painter_styles` lists the styles. Each has a name, a one-line description, the prompt that sets the style, the model that paints it, and up to four example images. The room seeds ten defaults the first time anyone reads the list (`DEFAULT_PAINTER_STYLES` in `worker/painter.ts`: Minimalist, Maximalist, Swiss editorial, Toy-like, Risograph, Luxury, Brutalist, Hand-drawn, Retro-futurist, Flat illustration), and after that a style you delete stays deleted. You add, edit and delete styles under **Painter styles**, the last section of the Product room's Details panel, and paste or pick their example images there. Delete asks first, since a default you delete does not come back. The room keeps them in its `painter_style` table, at `GET/POST /api/crew/painter-styles` and `PUT/DELETE /api/crew/painter-styles/:id`.
- `paint` takes a title, the card's message, the brief (the subject and composition), one to four style names, an aspect ratio, and up to four reference images: image ids (a pasted screenshot, an earlier painting, an SVG's rendering) or sketch ids (the room copies a sketch's picture into the image table once, `sketch.image_id`). The prompt is the style's prompt, a line asking for drama, then the brief, then what to do with the references (`paintingPrompt`). Before any model runs, a durable step checks the call and reserves a `painting` row for each style (`reservePaintings` in `worker/crew/paintings.ts`), with no await between the check and the inserts, so paint calls that Flue runs in parallel share the hour instead of each seeing it whole. Each style's model then runs in its own durable step (`step.do`), in parallel, so a retry does not repeat a finished painting. The tool's abort signal and a 150-second deadline per style (`PAINT_TIMEOUT_MS`) cancel the model call and the download; an aborted call posts no card. The Worker downloads each result, since the model's hosted URL expires, and keeps it in the image table as kind `painting`. Then it posts one **paintings** card: each painting with its style, Copy image, Download and open full size, and a "Go with" for each that worked. A style that failed shows its error on the card instead of failing the call. A pick tells Keiko which image to look at and asks her to keep what it says about your taste; O'Brien hears it too (`paintingPickReports` in `worker/crew/picks.ts`). Keiko can have 12 paintings an hour (`PAINTINGS_PER_HOUR`). Reserved rows count, failed ones too, since each model call was made: a call that dies before it posts leaves its rows with the error "The paint call stopped before this painting was posted."
- `draw_svg` posts SVGs Keiko writes herself (icons, spot illustrations, diagrams) on an **SVGs** card, with Copy SVG and Download. She can draw 24 an hour (`SVGS_PER_HOUR`), and each SVG is at most 1.8 MB (`MAX_SVG_BYTES`), what one row holds.

The models, all through the Worker's `AI` binding (`env.AI.run`), with no API keys. Their inputs follow each model's input schema on Cloudflare's model page (`modelInput` in `worker/painter.ts`):

| Model                                  | Takes                                                                  | Cost (Cloudflare's list price)                         |
| -------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| `black-forest-labs/flux-3-image-klein` | `prompt`, `aspect_ratio`, `resolution: "1k"`, up to 10 `images` (URLs) | $0.009 for the first output megapixel, so about $0.009 |
| `krea/krea-3` (beta)                   | `prompt`, `aspect_ratio`, `resolution: "1K"`, up to 8 `image_urls`     | $0.03 an image, plus $0.07 for each reference image    |
| `recraft/recraftv4-1-flash`            | `prompt`, `size` (the aspect ratio); no reference images               | $0.007 an image                                        |
| `recraft/recraftv4-1-vector`           | `prompt`, `size`; answers with an SVG; no reference images             | $0.08 an image                                         |

So one paint call costs from about $0.03 (four FLUX or Recraft Flash styles) to about $1.24 (four Krea styles with four reference images each). Two FLUX styles, one Krea and one Recraft Flash, with one reference image, cost about $0.13.

A model fetches a reference image itself, so the Worker passes it a signed link (see Images below) that lasts 10 minutes. The links need the app's public HTTPS origin, which the room learns each time the admin loads the app (`GET /api/crew/room` saves it in the room's key-value storage), so a preview's room signs links to the preview. On a local dev server there is no HTTPS origin: `paint` leaves the references out and says so.

The answers differ by model and by page of Cloudflare's docs, so `readModelResult` reads every documented shape: the output schema's `{ image }`, `{ state, result: { image } }`, BFL's `{ id, status: "Ready", result: { sample } }`, Krea's job `{ job_id, status, result: { urls } }`, and an image sent inline as base64 or a `data:` URI. A model that answers with a job that is not finished fails that style with an error that says so. For any answer with no picture, the Worker logs the answer's keys and status. The painter does not poll: BFL's and Krea's polling URLs need the provider's own key, which the binding keeps, and Cloudflare documents no way to wait on a job through the binding. The painter downloads over HTTPS only and stops reading a body as soon as it passes 8 MB, with or without a `content-length`.

A painting can be bigger than one Durable Object row: the room keeps up to 8 MB (`MAX_PAINTING_BYTES`) by splitting the bytes across `image_part` rows, and `loadImage` puts them back together (`worker/crew/image-store.ts`).

**SVGs.** An SVG can carry script, so the room never serves one in a way that can run on the admin origin:

- `checkSvg` (`worker/svg.ts`) reads the SVG as XML, strictly, and refuses, with a message the agent can act on, anything it cannot read (an unquoted value, a comment an HTML parser would end early, an element inside `<style>`, an entity XML does not know) and any SVG that is not one `<svg>` document. Elements and attributes come from an allowlist of drawing ones, so `<script>`, `<foreignObject>`, `<iframe>` and editor metadata such as `inkscape:label` are refused. It also refuses an event-handler attribute (`onload=`, `onclick=`), a `javascript:`, `vbscript:` or `data:text/html` link (also when hidden with entities or whitespace), an `href` or CSS `url()` that points anywhere but inside the SVG or at a `data:image` raster, a URL with a scheme in any other attribute (`values`, `to`, `fill`), an `<animate>` or `<set>` that changes a link, backslash escapes and `image-set()` in CSS, CSS `@import`, processing instructions other than `<?xml version…?>`, and DOCTYPE and ENTITY declarations. It strips a plain DOCTYPE. The check holds for an SVG opened on its own, as a download or pasted into a codebase. It does not use `HTMLRewriter`, which the Node unit tests cannot load, and which parses HTML while an SVG opened on its own is parsed as XML. A vector model's SVG goes through the same check, and fails as that painting's error.
- The app shows an SVG only through `<img>` with a `data:` URL, never a `blob:` URL: an `<img>` runs no script, and a `blob:` URL has the app's origin, so opening one in a tab would. Open full size shows the same `<img>` in a dialog. Download makes a `blob:` link typed `application/octet-stream` when it is clicked, which the browser saves rather than shows.
- `GET /api/crew/svgs/:id` serves the text with `Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:`, `Content-Disposition: attachment` and `nosniff`, for anyone who opens the route itself.
- Each SVG is also rendered to a PNG with Browser Rendering (through an `<img>` too), kept in the image table as kind `svg`, so Keiko can look at it with `look_at_image`. One browser session renders all of a call's SVGs: a `draw_svg` call's, or a paint call's vector paintings. If rendering fails, the SVG is kept without one.

The room keeps SVGs in its `svg` table and each painting in its `painting` table, with the prompt it was painted from.

**Not verified yet.** Image models cannot run locally (the `AI` binding is remote, and the dev server runs without it), so the unit tests cover prompt building, each model's input, every documented answer shape, the unfinished-job error, the abort and deadline, the size cap, SVG checks, the reservation and the retention, and the UI was checked with seeded paintings. On a Cloudflare preview, check: each model's real answer (bare `{ image }` or the wrapped shapes; a URL or inline bytes; whether the binding ever returns an unfinished job, which the log shows as "A painter model answered without a picture" with an unfinished status), that FLUX and Krea fetch the signed links, what format Recraft's vector model really returns (the docs' examples link to JPEGs), whether Recraft takes every aspect ratio the painter offers (its docs show only `4:5` and `1:1`), and the cost of one call in the dashboard.

### Images

The room keeps images in its `image` table (`worker/crew/image-store.ts`): an id, a kind (`upload` for the admin's, `painting`, `svg` for an SVG's rendering, `sketch` for a sketch's picture copied for the painter), the author, the type, the width and height, and the bytes. An upload is at most 1.8 MB (`MAX_UPLOAD_BYTES` in `shared/crew.ts`). A picture over what one row holds, such as a big painting, is split across `image_part` rows (`worker/crew/image-store.ts`), and the image row's own bytes are empty. The Worker reads the type and size from the image's own bytes (`imageInfo` in `worker/images.ts`) and keeps PNG, JPEG, WebP and GIF only. A sketch keeps its picture in its own `sketch` row.

Everything lives in the one CrewRoom Durable Object, which holds 10 GB, and a full store fails every write in every room. So the room deletes paintings, the SVGs of vector paintings and SVG renderings (kinds `painting` and `svg`) older than 30 days (`pruneImages` in `worker/crew/image-store.ts`), unless you went with the painting, a message carries the image, or a style keeps it as an example. A card that showed one shows an empty frame. Uploads, sketches and the SVG text Keiko drew stay. The hourly cron (`.flue/cloudflare.ts`) runs it, so nothing waits on it while a painting is saved. A preview runs no crons and prunes nothing.

- `POST /api/crew/images` stores one image; the body is the image, with its content type. It returns `{ id, width, height }`.
- `POST /api/crew/messages` and `POST /api/crew/rooms/:room/messages` take `images`, a list of those ids, beside `body`. A message carries the ids and sizes in its `images` column.
- `GET /api/crew/images/:id` serves an image to the admin, who fetches it as a blob, because an `<img src>` cannot send the token.
- `look_at_image` passes one image to the agent's own model in a `harness.prompt`, with the agent's question, as `look_at_screen` does, because a Flue tool result reaches the model only as text. An agent has the tool only when its model takes images. `useCrewMember` decides that with Flue's `resolveModel`, from the same pi-ai catalog Flue resolves the model from: a model the catalog lists as text only, or does not list, gets a placeholder in place of an image. `command-2`'s DeepSeek model is text only there, so Data has no `look_at_image`, and its instructions tell it to ask what an image shows instead. Change an agent's model, and its tool and instructions follow.

**Signed links.** An image model on Cloudflare, such as `black-forest-labs/flux-3-image-klein`, takes a reference image only as an HTTPS URL that it fetches itself, without the admin's token. `signedImageUrl()` in `worker/images.ts` makes a link to one image that works until it expires (15 minutes by default, at most a day): `/api/public/images/:id?expires=…&sig=…`, where `sig` is an HMAC-SHA256 of the id and the expiry, keyed with the `IMAGE_URL_SECRET` secret. That route serves the image only for a valid signature that has not expired. `worker/api.ts` lets every path under `/api/public/` through without a token, so each route there must check a signature of its own; every other `/api` route still needs the admin. Without the secret, signing throws an error that says so, and no link is valid. Set it once, with any long random string:

```bash
openssl rand -base64 32 | pnpm exec wrangler secret put IMAGE_URL_SECRET
openssl rand -base64 32 | pnpm exec wrangler preview base-config secret put IMAGE_URL_SECRET
```

Locally, put `IMAGE_URL_SECRET=<any string>` in `.dev.vars` (`.dev.vars.example` lists it). Changing the secret breaks every link already signed, which is harmless, since each lasts minutes.

### Side-threads

For a small favour from another room, such as one check or one number, an officer calls `pass_note`. Its note becomes the first message of a side-thread in its own room, and the officer it asks wakes in a Flue conversation of that thread's own (`thread:<id>`), not its running one. In that run it sees only the thread, with its memory, to-dos and open items, its room's charter, Common Knowledge and the Situation Report, and none of any room's timeline. Its tools are the same as in any run except `pass_note`, so Data can run queries for a favour, and a favour never starts a second thread. It answers with `reply_in_thread` and closes the thread when the favour is done; what it wants to keep it saves with `remember`, which lands in its one memory. The asker hears each reply as a `<thread-reply>` in its running conversation. A thread counts against the hourly limit on agents waking each other, and closes itself after 10 replies. In the app it folds under its first message, read-only.

A thread run and the helper's main run can overlap, so the room keeps them apart. Each row of `edit_log` records the run that made it: the thread's first message id, or null for the main run. The thread run's receipt goes in the thread and lists only its own edits, and the main run's receipt lists only the main run's. Every tool that writes to `edit_log` takes the run's thread, which `useCrewMember` in `.flue/agents/use-crew-member.ts` reads once and passes to the tool factories (an agent's own tools come in through its `tools` option). Each run also records its own start: `main_run` holds the main run's, and `thread_run_at` on the thread's first message holds the thread run's. A receipt and the GitHub edit cap count from the run's own start. The agent shows as working while either run is going, since the first of them started, in whichever order they start and end. The CLEF outcome of a main run does not count replies in a thread where the agent is the helper. Two things stay shared: a thread run's own posts in a room, which count as the main run posting, and the per-run cap on GitHub drafts, which counts both runs' drafts.

### The Command room: Riker and Data

Riker is your proxy. He knows three things well: the **charter** (your principles and lessons, which you curate together), where the agents overlap or disagree, and the directives he has given the other rooms. Everything else he asks the expert for. Data argues from the evidence: he runs the database queries and takes more steps on a bigger model (`MODEL_COMMAND_2`). He also keeps a **playbook**: the metrics you like in each domain and how you like charts drawn, which he learns from your reactions.

The Command room has three more kinds of card:

- **For the charter**: a principle or lesson Riker or Data proposes. It counts only once you keep it.
- **Weekly brief**: the week, folded until you open it.
- **Pre-meeting report**: Data's numbers for the brief's agenda, folded the same way. Data files one whenever a meeting starts without one; if you ask him for a pre-meeting briefing first, that is the report.

Anything you want to add to an answer, write in the room: your answers, and the times you overrule Riker, are how the Command room learns you.

**The weekly cycle.** An hourly cron finds Sunday 04:00 in your time zone (set in the Command room's details; Cloudflare crons are UTC only) and has Riker post the week's brief in the Command room. From then on, a banner on every other page invites you to the weekly meeting until it happens, and "Start the weekly meeting" in the Command room begins it. Every meeting starts from Data's pre-meeting report; when Data files it, Riker reads it and comments in the room. Riker keeps a ledger of directives for the other rooms until you say the meeting is done; his prompt asks for this, and nothing in the code enforces it. Then he closes the meeting with minutes in the Common Room, followed by one directive to each room's principal, with priorities and suggested edits, each marked as a command or a suggestion. The officer applies what it accepts, and the room posts a receipt of the edits it actually made ("👍 3 edits: …"), built from its workspace changes rather than from its own account.

### Components in messages

Any agent can put components in its markdown as a fenced block whose language names the component and whose body is JSON: `chart` (line, bar or area), `stats` (a row of headline numbers) and `table` (sortable, optionally filterable). The catalog and its schemas are in `shared/blocks.ts`, and `src/components/crew/blocks.tsx` draws them with the app's own components, in the Common Room and in every subject's room. It is the generative-UI pattern without MDX: an agent describes a component and the app decides how it looks, and no agent-written markup or code ever runs. Every tool that posts text refuses a block that does not parse and tells the agent what to fix, so a broken block never reaches you.

### Where things live

- **The agents** are [Flue](https://flueframework.com) agents in `.flue/agents/`. Each agent's Flue identity is its key, set with its `agentName` static, and `@flue/vite` builds each one into a Durable Object in this Worker named after it (`FlueProduct1Agent`, bound as `FLUE_PRODUCT_1_AGENT`). Changing an identity is a `renamed_classes` migration in `wrangler.jsonc`, and it starts the agent's Flue conversation afresh, because Flue keys a conversation by the identity; memory and everything else in `CrewRoom` stays. `.flue/agents/use-crew-member.ts` holds what every agent shares: the model, the tools, and the context each run starts with.
- **The room** is the `CrewRoom` Durable Object (`worker/crew/room.ts`), one instance named `crew` (`ROOM`). The production room holds real data, so a schema change is an in-place migration in its constructor that is safe to run twice, never a new instance name. It is an [Agents SDK](https://developers.cloudflare.com/agents/) `Agent` with no model. Its SQLite holds the Common Room and every subject's room, each agent's to-dos, memory and open items, the charter, and CLEF's decision log. It is not in Postgres, so no migration touches it. The app connects to it with `useAgent` at `/api/crew/live`, which reconnects on its own. The room's synced state holds each agent's status, the weekly cycle and each room's count of open cards, and its socket messages announce new messages and workspace changes. A WebSocket cannot carry headers, so the app sends the Supabase token as `?token=`, and `worker/api.ts` accepts a query token on that route only.
- **The routes** are in `.flue/app.ts`, which adds `/api/crew/*` to the admin API from `worker/api.ts`. `.flue/cloudflare.ts` exports the room and runs the hourly cron: `product-1`'s daily run at 07:00 UTC, and `command-1`'s brief.

### How a message reaches an agent

CLEF decides where each Common Room message goes when you send it:

1. A message that ends in "..." **stacks**: it wakes nobody, and it rides along with your next message that does.
2. An @mention of a started agent **sends** the message to that agent.
3. Otherwise a small Workers AI model (`CLEF_MODEL`) chooses between **sending** it to one agent and **leaving it in the room**. When more than one agent could answer, or CLEF cannot tell who, it sends the message to Riker, who passes it on. Agents read the room at their next run either way.

While you type, the chip above the compose bar shows the first two rules as they apply, and otherwise says CLEF decides when you send. The model runs only on send. Click the chip to pick a place yourself before you send. After you send, the note under your message opens the same menu: correct it there, and any agent the message should have woken wakes now.

The room logs every decision in `clef_decision`: what CLEF suggested, what the message did, your correction if you made one, and, for each agent the message woke, whether its run posted anything ("posted") or nothing ("silent"). The rows where you picked a place or corrected CLEF are its labels, and CLEF reads the latest 20 the next time it decides.

A message that wakes an agent becomes a signal in its `memory` conversation: a `<common-room-message>` from the Common Room, or a `<room-message>` from its own room, and the agent answers where it was asked. CLEF decides for the Common Room only; in a subject's room, the principal answers unless you name the associate.

### What a run did, step by step

While an agent runs, the room shows its steps under "<name> is working…": each tool it calls, in words ("Ran a query", "Read the Roadmap"), and each block of its model's thinking ("Thought for 5s"). When the run ends, the list folds under what the run produced, such as "Worked in 4 steps": the agent's last message, else its receipt, else the message that woke it. A step with input to read, such as the SQL of a query, the error of a failed call, or the thinking text, opens under its line.

- **Where the steps come from.** `observe()` in `.flue/crew.ts` reads Flue's runtime events in each agent's isolate: `tool_start` (the tool and its arguments) and `tool` (failed or not, and how long it took) for every tool the model calls, and `thinking_start` and `thinking_end` for each thinking block. `stepChange` in `worker/crew/steps.ts` turns an event into a step, and `describeTool` puts a tool call in words. A Flue submission is one run: `submission_running` opens it, its steps go to the room's `recordStep`, and `submission_settled` closes it, for every outcome. All of these go to the room one at a time, in the order Flue emitted them, so a run's close always lands after its steps.
- **Runs are keyed by submission, not by the agent's status.** An agent can run in its main conversation and in a side-thread at once, and either run can end first. `RunLog` in `worker/crew/run-log.ts` finds what a run produced from the run's own start time: its last message since then (in its side-thread, or outside side-threads for a main run), else its receipt, else the message that woke it. One conversation runs one submission at a time, so when a run starts, an older run of the same agent and conversation that is still open lost its close: the room marks it failed. A step that arrives after its run closed joins the closed run. The live list under the working marker shows every open run with steps, whatever the agent's status says.
- **Thinking.** The Workers AI models (Kimi, DeepSeek) stream `reasoning_content`, which Flue turns into thinking events. Claude on `product-2` sends thinking blocks when its request turns thinking on, which Flue's default thinking level (`medium`) does for a model its catalog marks as able to reason. A run whose model sends no reasoning shows only its tool calls.
- **What the room keeps** (`run` table): the last 10 runs of each agent (`RUNS_KEPT`), the latest 40 steps of a run (`MAX_STEPS`) with a count of the ones dropped, 300 characters of a tool's input, 200 of an error and 600 of a thinking block. The app reads them from `GET /api/crew/runs`, and the room's `run` socket event sends each change.
- **The components** come from shadcn's AI Elements: Chain of Thought, Reasoning and Tool are patterns built on shadcn's `Trace` component, which `src/components/ai-elements/trace.tsx` holds, and `src/components/crew/run-steps.tsx` draws runs with it. The admin app keeps `Trace` to itself, since the main app does not use it. `components.json` in this folder points the shadcn CLI here, so `npx shadcn@latest add trace --diff -c apps/admin` from the repo root shows upstream changes. Its `ui` alias puts new files in `src/components/ai-elements/`. When the CLI also offers a `collapsible.tsx` there, delete it: `trace.tsx` imports the main app's Base UI `@/components/ui/collapsible`. Keep the hand edits to `trace.tsx`: `cn` from `@/lib/utils` instead of shadcn's `cn` package (do not add that dependency), and `start`/`end` classes for right-to-left text.

### Room documents

Each room keeps named Markdown documents, which its officers and you write: the Command room keeps the Situation Report and the Business plan and status, and the Product room keeps the Roadmap. They can hold checklists, tables, the crew's chart, stats and table blocks, and Mermaid diagrams such as gantt charts. The app draws Mermaid itself, and shows a diagram that does not draw as its source.

A room's details list its documents, with the Situation Report pinned first. Open one to read it, edit it, or look through its revisions and restore an older one; a restore saves the old text as a new revision. Every save names the revision it started from, and the room refuses a save from anything but the current revision, so nobody overwrites a change they have not seen. An agent's briefing lists its room's documents with their revisions but not their text; it reads one with `read_document` when it needs it. The revision rules live in `worker/crew/documents.ts`, and the tables (`document`, `document_revision`) in `worker/crew/room.ts`.

### What an agent can do

Every run starts with a briefing that `worker/crew/briefing.ts` writes: the time, Common Knowledge, the Situation Report, the list of the room's documents, the cards in the agent's room, its workspace, and what is new in the Common Room and in its room since its last run. The Command room's members also get the charter and the weekly cycle. The tools:

- `activity_between`: signups, reviews and each reviewer, new decks, and library and chat counts for a window
- `run_sql`: one SELECT, run as `admin_reader` with an 8-second timeout and at most 200 rows
- `post_to_common_room`: a message in the Common Room, optionally with 2 or 3 buttons
- `post_to_room`: a message in the agent's own room
- `bring_to_admin`: a card in the agent's own room
- `propose_change`: a "Change to the plan" card in the agent's own room
- `read_document`: any room's document, with its revision
- `write_document`: a new revision of one of the agent's own room's documents, or a new document, from the revision it read
- `add_todo`, `update_todo`, `remember`, `forget`, `add_open_item`, `close_open_item`, `read_room`: the workspace
- `look_at_image`, for an agent whose model takes images: one of the images the admin pasted into a message, with a question about it ("Images", above)
- `propose_charter`: an entry for the agent's room's charter, as a card
- Riker has `write_brief`, `start_meeting` (for a meeting the admin asks for outside the Command room) and `close_meeting`, Data has `note_playbook` and `file_report`, and Keiko has `look_at_screen`, `sketch_screens` and `read_sketch` ("Keiko's sketches", above), and `painter_styles`, `paint` and `draw_svg` ("Keiko's painter").

Every agent runs on the Workers AI model in `CREW_MODEL` (`@cf/moonshotai/kimi-k2.6` today) unless its seat has a setting of its own: `MODEL_COMMAND_2`, `MODEL_PRODUCT_1` (`@cf/moonshotai/kimi-k2.7-code`) and `MODEL_PRODUCT_2` (Claude Opus 5.5). They run through the Worker's `AI` binding, so no model API key is needed. Any Workers AI model that takes tools works, and changing the var is the only step. Flue retries a failed run at most 3 times, because every attempt is a paid model run.

### GitHub: milestones and epics

The Roadmap, a Product room document, is the plan. GitHub (`mhsnook/sunlo`, the `GITHUB_REPO` var) holds the part of it that is ready to build, as milestones and epics, and `product-1` keeps them current. An epic is an ordinary issue labelled `epic`, with a checklist of PR-sized steps, inside a milestone; Claude Code sessions take their work from it. The Roadmap links to GitHub by convention, such as `- [ ] Onboarding (#812)`, and no code parses it.

- **Anything new is a card first.** `draft_issue`, `draft_milestone` and `draft_comment` put a draft on a card in the agent's room. You can edit the draft on the card, then "File it", and the Worker publishes exactly what the card holds (`POST /api/crew/messages/:id/file`). The agent hears back with the number, and with both versions when you edited it; it keeps what it learns as writing-style memories (`note_writing_style`), shown in the room's details as "How you like issues written".
- **After that, the agent edits directly.** `edit_issue` and `edit_milestone` change any issue or milestone: an epic's body and checklist, titles, labels, milestones, due dates and state. Each change appears in the run's receipt, built from what the tool did.
- **Reading:** `read_issue`, `list_milestones`, `list_epics` and `github_changes_since`. `command-1` has these read tools only (`githubAccess` in `shared/crew.ts`).
- **What stays in code** (`worker/crew/github.ts`, `.flue/tools/github.ts`): every write, at the tap for a card and in the tool for an edit, is refused if it contains an email address, a user's id or a username, because the repository is public. A run may draft at most 5 cards (`DRAFTS_PER_RUN`) and make at most 20 edits (`EDITS_PER_RUN`). Every filed issue gets the `from-crew` label.
- Before its first edit, `product-1`'s prompt has it propose, as one card, how the existing milestones and epics map onto the Roadmap. It reads what changed on GitHub on its daily run.
- "Copy brief" on a card copies its text, with the link once it is filed, for pasting into a Claude Code session.

Without the three secrets below, no agent has GitHub tools, and each briefing says so.

To set it up, once:

1. On GitHub, open **Settings › Developer settings › GitHub Apps › New GitHub App**. Name it, for example, "Sunlo Crew". Turn off **Webhook › Active**. Under **Repository permissions**, set **Issues** to **Read and write** (it covers labels and milestones) and **Pull requests** to **Read-only**. Leave everything else at No access. Create the app and note its **App ID**.
2. On the app's page, **Generate a private key**. GitHub downloads a `.pem` file in PKCS#1 format, and Workers can only read PKCS#8, so convert it:

   ```bash
   openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in sunlo-crew.pem -out sunlo-crew-pkcs8.pem
   ```

3. **Install App** on your account, with **Only select repositories** set to `mhsnook/sunlo`. The installation id is the number at the end of the page's URL (`github.com/settings/installations/<id>`).
4. In the repository, create the label `from-crew`, so the app does not depend on creating it.
5. Set the secrets from `apps/admin`, then delete both `.pem` files:

   ```bash
   pnpm exec wrangler secret put GITHUB_APP_ID
   pnpm exec wrangler secret put GITHUB_APP_INSTALLATION_ID
   pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY < sunlo-crew-pkcs8.pem
   ```

6. Previews do not inherit production secrets. Set the same three in the previews' base configuration, which each new preview copies when it is created (a preview that already exists keeps what it had):

   ```bash
   pnpm exec wrangler preview base-config secret put GITHUB_APP_ID
   pnpm exec wrangler preview base-config secret put GITHUB_APP_INSTALLATION_ID
   pnpm exec wrangler preview base-config secret put GITHUB_APP_PRIVATE_KEY < sunlo-crew-pkcs8.pem
   ```

   A preview files on the same public repository as production.

If the key is still in PKCS#1 format, `githubFor()` throws an error that names the fix.

## Commands

Run these from the repo root:

```bash
pnpm admin:dev         # the app and the Worker, one Vite server at http://localhost:5174
pnpm admin:check       # typecheck the app, and the Worker with .flue/
pnpm admin:build       # production build: dist/client (the app) and dist/sunlo_admin (the Worker)
pnpm test:unit         # includes worker/**/*.test.ts
```

`vite dev` runs the Worker in workerd through `@cloudflare/vite-plugin`, so the app, `/api`, the crew room's WebSocket and the agents share one origin, as in production.

There is no deploy command: Cloudflare deploys on a merge to `main`.

## Local development

The Worker reads `apps/admin/.dev.vars`, copied from `.dev.vars.example`. `SUPABASE_URL` and `SUPABASE_ANON_KEY` come from `supabase status`; `IMAGE_URL_SECRET` is any string. The database connection is the Hyperdrive binding's `localConnectionString` in `wrangler.jsonc`, which the dev server uses in place of the production Hyperdrive config. It connects to local Supabase as `admin_reader` with the password `admin_reader`, and the migration creates that role with no password, so set one once:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "alter role admin_reader password 'admin_reader'"
```

Roles belong to the Postgres cluster, not the database, so the password survives a `supabase db reset` as long as the local Supabase containers do. If the Worker reports a failed sign-in after a reset, run the command again. Never put the password in a seed file: `[db.seed]` loads every file in `supabase/seeds/` into preview and production databases too.

The `AI` binding always runs remotely, so the dev server needs `wrangler login` (or `CLOUDFLARE_API_TOKEN`), and agent runs and CLEF bill to that account. Without a login, start it with `ADMIN_REMOTE_BINDINGS=false pnpm admin:dev`. The room, the workspaces and the stats work. CLEF leaves every message in the room, and agent runs fail at the model call.

`worker/worker-configuration.d.ts` is generated by `wrangler types` on `pnpm install` and is not committed. Run `pnpm install` again after changing `wrangler.jsonc`. It does not know Flue's `FLUE_*` bindings, which `@flue/vite` adds at build time.

## How it shares code

- `@/…` resolves to the main app's `src/`, so `@/components/ui/button` and `@/lib/supabase-client` are the same files the main app uses.
- `~/…` resolves to `apps/admin/src/`.
- The main app must never import from `apps/admin`.
- `worker/` and `.flue/` are one TypeScript project (`tsconfig.worker.json`), and import nothing from `src/` except, in tests, the Zod schemas.
- `shared/` holds what both sides need: the crew roster and the crew API's Zod schemas.

## Deploying

Workers Builds (Cloudflare's Git integration) builds and deploys the `sunlo-admin` Worker on every push to `main`. A push to any other branch builds a [Worker Preview](https://developers.cloudflare.com/workers/previews/) instead, at `<branch>-sunlo-admin.<account subdomain>.workers.dev`, from the `previews` block in `wrangler.jsonc`. A preview has its own crew room and agents, reads the production database through the same read-only Hyperdrive config, signs admins in against production Supabase, and runs no crons. The dashboard settings are in `docs/deployment.md`, under "Cloudflare" › "Setup".

`wrangler.jsonc` serves `dist/client` as static assets with an SPA fallback and runs the Worker for `/api/*`, on the custom domain `admin.sunlo.app`. It has no `main`: `@flue/vite` generates the Worker entry, which serves `.flue/app.ts` and exports the room and agent Durable Objects. `vite build` also writes a redirect that points `wrangler deploy` at the built config, so the deploy command needs no flags. A new agent needs a new migration entry in `wrangler.jsonc`; never edit a deployed one. The `previews` block inherits nothing from the top level, so a new var or binding goes in both places. The custom domain needs the `sunlo.app` zone on the same Cloudflare account.

The Worker reaches the database through [Hyperdrive](https://developers.cloudflare.com/hyperdrive/), bound as `HYPERDRIVE` in `wrangler.jsonc`. The Hyperdrive config holds the production connection string for `admin_reader`, so the Worker has no database secret of its own. Hyperdrive is required, not an optimisation: Supabase signs its database certificates with its own CA, which a Worker's TLS socket cannot verify, and from Cloudflare's network that handshake hangs rather than failing. Hyperdrive makes the TLS connection on the Worker's behalf. If the database stops answering, every `/api` route returns a 500 after 15 seconds instead of hanging, and the Worker logs the reason.

GitHub issue filing needs three optional secrets, set with `wrangler secret put` or in the dashboard: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID` and `GITHUB_APP_PRIVATE_KEY` ("GitHub: milestones and epics", above). Signed image links need `IMAGE_URL_SECRET` ("Images", above).

A pull request that touches only `apps/admin/` skips the `scenetest`, `bundle-size` and `prod-bundle-scan` jobs in `.github/workflows/test.yaml`, because those test the main app and take about twelve minutes; the `changes` job in that workflow decides, and `pr-checks` and `unit` still run. That is why the admin's test ids are registered in `apps/admin/TEST_IDS.md` rather than the main app's registry.

On Workers Builds, `vite.config.ts` sets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `wrangler.jsonc`: `vars` on `main`, and `previews.vars` on any other branch. The app and the Worker therefore always point at the same Supabase project, and the dashboard needs no build variables. Do not deploy by hand: a local build reads the root `.env`, which points at local Supabase, and a local build with those two variables missing silently drops the Supabase SDK (`docs/deployment.md`, "Build Environment Footgun").
