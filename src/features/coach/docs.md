# `features/coach` — the AI coach

The coach is a chat that builds a learner's deck with them. It renders at `/coach/$lang` as two halves: the page on the start side shows sets of phrases, requests and playlists, and the chat on the end side talks about them. The coach puts things on the page with a tool call, so the page is part of its reply. Issue #839 is the epic.

The route is signed-in only and sits outside `_user`, so it has none of the app's chrome. `src/routes/coach.tsx` redirects a visitor to `/login` and loads the same user data `_user` loads.

## How a turn runs

The worker makes one model call per request, and the browser runs the tools.

1. `sendToCoach` in `engine.ts` appends the learner's message to the transcript and calls `POST /api/coach` (`worker/coach.ts`).
2. The worker adds the system prompt and the tool definitions, calls Claude through the Workers AI binding (`COACH_MODEL`), and returns the reply's text and tool calls.
3. The engine runs each tool call with `runTool` (`tools.ts`), appends the results, and calls the worker again. The loop ends when a reply has no tool calls, or after `MAX_STEPS`.

The tools run in the browser because the data they need is already there. Searches read `phrasesFull` and the other live collections; `add_to_deck` writes through `cardsCollection` with the usual optimistic insert; `show_on_page` writes to the store the page renders from. The worker never sees the learner's deck, only what a tool result says about it.

`protocol.ts` is the contract between the two sides: the message shapes, and each tool's name, description and zod input schema. The worker imports it to build the tool definitions (`z.toJSONSchema`), and the browser imports it to validate the model's tool input. Change a tool there and both sides follow.

## State

Zustand, in `store.ts`, persisted to localStorage under `sunlo-coach`, one thread per user and language. A thread holds two lists that look alike and are not:

- `transcript` is what the model sees: Anthropic message blocks, including tool calls and results.
- `log` is what the learner sees: their messages, the coach's text, and one-line notes such as "Added 12 phrases".

Things the learner does on the page (adding a phrase, opening a request) go into `log` at once and into `pageNotes`, which ride along with the learner's next message as `[Page: ...]` lines. A tap on the page does not wake the coach.

The coach's first message is fixed (`openingLine`), so the page shows it with no model call. The first `sendToCoach` writes it into the transcript.

`transcript.ts` keeps the transcript valid for the API: it merges consecutive user messages, answers a tool call that never got a result, and cuts long conversations at a user message.

## Search

`search_library` and `find_similar` call `runSemanticSearch` (the `search` Edge Function) first. When it fails or returns nothing, they fall back to word matching over the local collections (`keywordRank` in `library.ts`) or, for look-alikes, to shared tags. The fallback is weaker: a query for "food" does not find "what did you eat?". The model compensates in part, because it rewrites queries.

## Running it locally

- `pnpm dev` with `pnpm worker:dev` calls the real model. The `AI` binding always runs remotely, so the worker needs `wrangler login`.
- `VITE_COACH_USE_MOCK=true` (set by `pnpm dev:local` and `pnpm build:test`) swaps in `mock.ts`, a scripted model that searches for whatever the learner types, shows the results, and adds them on request. Scenetest specs run against it.
