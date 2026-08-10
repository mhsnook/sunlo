# `features/chat` — prototype conversational phrasebook search

**This is not the friend chat.** User-to-user messaging lives in `features/social` (`chatMessagesCollection`) and renders under `/friends/chats/*`. This module shares the word and nothing else: it is a prototype that finds phrases by conversation, and it holds no messages.

## Where it renders

`src/routes/chats.$lang.lazy.tsx` → `/chats/$lang`, mounting `ChatPage` inside `ChatLangProvider`.

The route sits at the top level, outside `_user`, so it needs no session — this is the public showcase at `sunlo.app/chats`, not a signed-in feature. Its parent `src/routes/chats.tsx` preloads `languagesCollection` and throws when it comes back empty, so a broken seed pipeline fails the route loudly instead of rendering an empty language picker.

## State

Zustand, in `store.ts`. No TanStack DB collection, because nothing here is persisted: a turn list, a selection, and a cart live for the length of the visit. That is the one place this module departs from the app's collections-everywhere shape, and it departs because there is no server-side row to sync.

## The search call

`chatSearch` in `api.ts` is one of two implementations picked at module load:

- `chatSearchLive` calls `runSemanticSearch()` from `@/hooks/use-semantic-search`, which invokes the **`search` Edge Function**. That is this module's only external service. It asks for phrase entities, passes `excludePids` so a phrase already in the cart is not offered twice, and takes the top 3.
- `chatSearchMock` returns canned phrases after a 350 ms delay.

The mock is selected when `VITE_CHAT_USE_MOCK === 'true'` or `MODE === 'test'`, so scenetest specs run without a populated `search_corpus`.

Two things worth knowing before you edit either one. `SUPPORTED_LANGS` lists `spa` and `hin`, while `MOCK_BANK` also carries `kan` — the mock covers a language the picker does not offer. And an unknown language falls back to the Spanish bank rather than returning nothing, which is fine for a demo and would be wrong in the live path.

## Relationship to the search module

This module consumes the search stack; it does not extend it. `runSemanticSearch` is the same primitive that `useHybridSearch` composes with `useTrigramSearch` for the main phrase search. Chat takes the semantic half alone, because a conversational query has no useful trigram overlap with the phrase it should return.

Ranking, corpus shape, and the Edge Function contract are search's business. If a result looks wrong, look there first.

## Normalization and suggestions

Two layers, split by whether the user gets a say.

`normalize.ts` runs unconditionally: lowercase, strip combining marks, drop punctuation, collapse whitespace, plus a Spanish `ñ → n` pass. The same function runs in three places — this client, the Edge Function, and the backfill script — and the three have to agree, or indexed content stops matching the query built from it.

`suggestions.ts` holds the language-specific rules, loaded from `rules/*.json`. These surface in the UI one at a time for the user to accept or dismiss. Anything regional, debatable, or plausibly wrong belongs here rather than in `normalize.ts`, where it would be applied silently.
