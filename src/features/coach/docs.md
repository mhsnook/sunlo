# `features/coach` — the AI coach

The coach is a chat that builds a learner's deck with them. It renders at `/coach/$lang` as two halves: the page on the start side shows sets of phrases, requests and playlists, and the chat on the end side talks about them. The coach puts things on the page with a tool call, so the page is part of its reply. Issue #839 is the epic.

The route sits outside `_user`, so it has none of the app's chrome. It is open to visitors without an account; for a signed-in learner, `src/routes/coach.tsx` loads the same user data `_user` loads.

## The agent

The coach is a [Flue](https://flueframework.com) agent, `.flue/agents/coach.ts`. Flue runs each conversation in its own Durable Object (`FlueCoachAgent`), which keeps the transcript, runs the model and the tools, and retries a turn that a deploy interrupts. `.flue/app.ts` mounts it at `/api/coach/agent/:id`, behind the Supabase token check and `requireOwnConversation` (`worker/coach-access.ts`).

Each learner has one conversation, keyed on their uid (`coachConversationId` in `protocol.ts`), across every language they learn and every device they sign in on. The Worker refuses any id but the caller's own uid. Because one conversation spans languages, every message starts with a context line (`[Context: ...]`, see below) that says which language page is open; the agent reads it from the delivery (`useDelivery`) for its instructions and its tools, so the model never picks the language its tools search. Each set the coach shows carries its language, and a language's page shows only its own sets.

## Visitors without an account

A visitor has no uid, so the page shows the fixed greeting and the Flue hook stays dormant (no client). In place of the composer, the chat offers them to continue as a guest, log in, or create an account (`guest-choice.tsx`). Nothing is created until they choose. "Continue as guest" calls `supabase.auth.signInAnonymously()`; the auth context re-renders the page with the uid, and the composer shows. Their first message goes through the hook's `sendMessage` like any learner's, which re-checks a conversation that did not exist when the hook first read it. `coach.$lang.lazy.tsx` reads `useAuth()` rather than the route context, which keeps the auth from when the route loaded.

An anonymous user is a real user with the `authenticated` role and the `is_anonymous` JWT claim:

- The trigger `on_anonymous_user_created` gives them a `user_profile` row at sign-in, like any other user.
- They can write their own `user_` tables: deck, cards, reviews and profile.
- A restrictive RLS policy, "Anonymous users cannot add public content", refuses their inserts into every other table: phrases, translations, tags, requests, comments, playlists, upvotes, friend requests and chat. The coach page shows a request draft as text for them (`coach-request-needs-account`), because the form would fail.
- Two more guards cover what RLS on public tables does not reach: restrictive policies on `storage.objects` refuse their uploads, and `confirm_draft_phrase` (security definer) refuses them.
- `feedback` stays open to them, as it is to signed-out visitors.
- In the Worker, only the coach's routes take them (`requireSession`). Every other `/api` route uses `requireUser`, which refuses an anonymous user with 403.
- A trigger, `guard_anonymous_profile`, refuses a change to their `username` or `avatar_path`, because both show on `public_profile`. `/profile` shows them the sign-up form instead of those fields, and `/getting-started` sends them to `/signup`.
- Outside the coach page, a guest can browse but not learn. The app's auth gates (`AuthenticatedDialog`, `AuthenticatedDialogContent`, `RequireAuth`, `useRequireAuth`, `useIsAuthenticated`) require an account by default; only notifications pass `allowAnonymous`. Review, deck settings, manage deck, add deck and the card-status menu all ask a guest to sign up. On the coach page, the coach still adds phrases to a guest's deck, and the deck carries over when they sign up.

## Signing a guest up

One form, `GuestSignupForm` (`src/components/guest-signup/`), turns a guest into an account: an email and a display name. It calls `supabase.auth.updateUser({ email, data: { username } })`, which keeps the uid, so the deck and the conversation carry over. Supabase refuses a password until the email is verified, so the confirmation link goes to `/set-new-password`. Converting needs manual linking enabled in the Supabase project (`enable_manual_linking`). `/login` still works for a guest, and logs them in to their other account.

`guard_anonymous_profile` refuses the username until the email is confirmed, so the display name waits in the auth user's metadata. `claimGuestUsername` (`auth-lifecycle.ts`) writes it to `user_profile.username` on the first load as an account. If someone took the name in between, the write fails and `/getting-started` asks for one. Confirming the email fires `handle_new_user` again, and its `on conflict do nothing` keeps the profile.

The form shows up in four places:

- In an auth gate, in place of the log-in prompt. Each gate passes `guestLead`, a sentence that says what needs the account ("Posting a public comment needs an account.").
- On `/signup` and at the top of `/profile`.
- In `GuestSignupDialog`, which the root route opens on any page when the URL has `?signup=<reason>` (`SignupReasonSchema`). `useRequireAuth` opens it for a guest instead of sending them to `/login`.
- From the coach, two ways. `offer_account` puts a "Create my profile" button beside the coach's suggested replies, and the button opens the dialog. When the coach uses `navigate`, the page adds `?signup=coach` for a guest, so the dialog opens on arrival. Review and profile are left out, because those pages show the form themselves.

The `[Context: ...]` line carries `guest: true` for a guest, and the prompt tells the coach what a guest can do and when to offer an account.

## The deck and the intention

The deck is created when the coach knows what the learner wants: their goal and how much of the language they already know. The coach calls `save_intention`, and the page writes it to `user_deck.intention` with `saveDeckIntention`, creating or unarchiving the deck first. A signed-in learner's deck gets the same column the same way. The `[Deck: ...]` line carries the open language's intention, or "no intention saved yet", so the coach asks once per language.

## Who does what

The agent and the page split the work by what each can reach.

- **The agent reads the public library.** `search_library`, `find_similar` and `list_tags` (`.flue/coach/library.ts`) query Supabase with the anon key. Search calls `matchCorpus` from `worker/search.ts` in-process, which ranks by meaning, and falls back to `search_by_trigram`, which ranks by spelling and needs no Workers AI.
- **The page owns the learner's deck.** Flue keeps tokens out of agents, so the agent cannot write the learner's cards. `add_to_deck` and `navigate` only return what to do. After each message, `send` in `hooks.ts` waits for its submission to settle, reads that submission's tool outputs (`pageActions`), and adds the cards with `addPhrasesToDeck` under the learner's own session.
- **The page tells the coach what overlaps the deck.** The agent's searches cannot leave out the learner's own phrases, because it cannot read the deck. After a turn that showed phrases, the page adds a note such as "3 of the 4 phrases you just showed were already in the deck" to the learner's next message, and the prompt tells the coach to offer a different search, a request or a friend. Filtering the search itself would need the agent to read the deck: a read-only, uid-scoped database role like the admin's `admin_reader`, which is a migration.
- **The coach drafts requests on the page.** `draft_request` puts a `RequestForm` beside the chat, filled in with the coach's wording. The learner edits it and presses the button; nothing is posted for them. The chat stays open throughout.
- **The page renders from the conversation.** `readConversation` (`conversation.ts`) turns Flue's messages into the chat log, the sets the coach showed (`show_on_page` outputs) and the suggested replies. A set holds only ids; the page draws each phrase, request and playlist from the local collections.

`protocol.ts` holds what both sides share: the tool input schemas and descriptions (Valibot, as Flue requires), the output shapes the page reads, and the conversation id.

## What the page sends

Each message to the agent is the learner's text with lines from the page before it (`composeMessage`):

- `[Context: {...}]` is the open language, the learner's translation language and their name, as JSON (`formatCoachContext` and `parseCoachContext` in `protocol.ts`). The agent's instructions (`.flue/coach/prompt.ts`) and tools are built from it.
- `[Page: ...]` notes what the learner did on the page since their last message, such as adding a phrase or opening a request. The chat shows these as notes.
- `[Deck: ...]` summarises the deck: its size and its most common tags. Only the agent sees it, because the agent cannot read the deck.
- `[Page: you opened with: ...]`, on the first message only, carries the fixed greeting (`openingLine`) the page showed before any model call.

`store.ts` keeps the page's own state for the session, per language: the pending notes, the sets the learner opened from a tile, and which set is on the page.

## Limits

- `Coach.durability` allows 3 attempts and 2 minutes per message, since every attempt is a paid model run.
- `requireOwnConversation` refuses a message over 16 kB (413) or without a length (411), and counts messages against `COACH_LIMITER` (20 a minute), or `COACH_ANON_LIMITER` (5 a minute) for an anonymous user. Anyone can make a new anonymous uid; Supabase caps anonymous sign-ins per IP address (30 an hour by default).
- Until the conversation's history loads, the chat shows "Loading your conversation…" and keeps the composer off, so a returning learner is never greeted as new.

## What the coach can make the page do

Every action needs the learner's own message in that turn, and acts in their session with their permissions: adding phrases to their deck, saving their intention on it, showing sets, drafting a request for them to post, offering a guest an account, and moving between a fixed list of in-app pages (`navigate`). It cannot post, delete or open anything outside Sunlo.

## The model

`COACH_MODEL` in `wrangler.jsonc` names the model: Gemma 4 26B (`cloudflare/@cf/google/gemma-4-26b-a4b-it`), chosen for cost and speed, with thinking off. Flue reads the part before the first `/` as the provider, so the id needs the `cloudflare/` prefix that `cloudflareBindingProvider` registers; without it every turn fails while the agent starts, as "internal error". It goes through the Workers AI binding and the `sunlo-app` AI Gateway (`cloudflareBindingProvider` in `.flue/app.ts`). The instructions spell out each turn as numbered steps, because smaller models follow steps more reliably than general guidance.

With `VITE_COACH_USE_MOCK=true` (set by `pnpm dev:local` and `pnpm build:test`), `vite.config.ts` sets `COACH_MODEL` to `mock/coach`, and `.flue/app.ts` registers the scripted model in `.flue/coach/mock.ts` under that id. It searches for whatever the learner types, shows the results and adds them on request. "account" offers an account, and "review", "my deck" and "my profile" navigate. Scenetest specs run against it.

## Running it locally

- `pnpm dev` runs the app and the Worker in one Vite server and calls the real model, which needs `wrangler login`.
- `pnpm dev:local` runs the scripted model without a Cloudflare login.

Reading a conversation that has no messages yet answers 404 (`stream_not_found`) until its first message creates it; the browser console shows that 404 for a learner who has never talked to the coach. Local conversations live in `.wrangler/state`; stop the dev server before deleting it.
