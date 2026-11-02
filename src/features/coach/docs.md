# `features/coach` — the AI coach

The coach is a chat that builds a learner's deck with them. It renders at `/coach/$lang` as two halves: the page on the start side shows sets of phrases, requests and playlists, and the chat on the end side talks about them. The coach puts things on the page with a tool call, so the page is part of its reply. Issue #839 is the epic.

The route is signed-in only and sits outside `_user`, so it has none of the app's chrome. `src/routes/coach.tsx` redirects a visitor to `/login` and loads the same user data `_user` loads.

## The agent

The coach is a [Flue](https://flueframework.com) agent, `.flue/agents/coach.ts`. Flue runs each conversation in its own Durable Object (`FlueCoachAgent`), which keeps the transcript, runs the model and the tools, and retries a turn that a deploy interrupts. `.flue/app.ts` mounts it at `/api/coach/agent/:id`, behind the Supabase token check and `requireOwnConversation` (`worker/coach-access.ts`).

A conversation id is `<lang>-<uid>.<thread>` (`coachConversationId` in `protocol.ts`). The Worker refuses an id whose uid is not the caller's. The thread token lives in localStorage per learner and language; "Start over" replaces it, and the `/coach/$lang` loader creates one when there is none. A second device therefore starts its own conversation. Storing the thread server-side would fix that, and needs a migration.

The first message creates the conversation with `initialData` (`CoachInitialDataSchema`): the language, the learner's translation language and their name. The agent's instructions (`.flue/coach/prompt.ts`) are built from it.

## Who does what

The agent and the page split the work by what each can reach.

- **The agent reads the public library.** `search_library`, `find_similar` and `list_tags` (`.flue/coach/library.ts`) query Supabase with the anon key. Search tries the `search` Edge Function, which ranks by meaning, and falls back to `search_by_trigram`, which ranks by spelling and needs no Workers AI.
- **The page owns the learner's deck.** Flue keeps tokens out of agents, so the agent cannot write the learner's cards. `add_to_deck` and `navigate` only return what to do. After each message, `send` in `hooks.ts` waits for its submission to settle, reads that submission's tool outputs (`pageActions`), and adds the cards with `addPhrasesToDeck` under the learner's own session.
- **The page renders from the conversation.** `readConversation` (`conversation.ts`) turns Flue's messages into the chat log, the sets the coach showed (`show_on_page` outputs) and the suggested replies. A set holds only ids; the page draws each phrase, request and playlist from the local collections.

`protocol.ts` holds what both sides share: the tool input schemas and descriptions (Valibot, as Flue requires), the output shapes the page reads, and the conversation id.

## What the page sends

Each message to the agent is the learner's text with lines from the page before it (`composeMessage`):

- `[Page: ...]` notes what the learner did on the page since their last message, such as adding a phrase or opening a request. The chat shows these as notes.
- `[Deck: ...]` summarises the deck: its size and its most common tags. Only the agent sees it, because the agent cannot read the deck.
- `[Page: you opened with: ...]`, on the first message only, carries the fixed greeting (`openingLine`) the page showed before any model call.

`store.ts` keeps the page's own state for the session: the pending notes, the sets the learner opened from a tile, and which set is on the page.

## The model

`COACH_MODEL` in `wrangler.jsonc` names the model: Gemma 4 26B (`@cf/google/gemma-4-26b-a4b-it`), chosen for cost and speed, with thinking off. It goes through the Workers AI binding and the `sunlo-app` AI Gateway (`cloudflareBindingProvider` in `.flue/app.ts`). The instructions spell out each turn as numbered steps, because smaller models follow steps more reliably than general guidance.

With `VITE_COACH_USE_MOCK=true` (set by `pnpm dev:local` and `pnpm build:test`), `vite.config.ts` sets `COACH_MODEL` to `mock/coach`, and `.flue/app.ts` registers the scripted model in `.flue/coach/mock.ts` under that id. It searches for whatever the learner types, shows the results and adds them on request. Scenetest specs run against it.

## Running it locally

- `pnpm dev` runs the app and the Worker in one Vite server and calls the real model, which needs `wrangler login`.
- `pnpm dev:local` runs the scripted model without a Cloudflare login.

Reading a conversation that has no messages yet answers 404 (`stream_not_found`) until its first message creates it; the browser console shows that 404 on a fresh thread.
