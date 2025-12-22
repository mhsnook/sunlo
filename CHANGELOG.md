## 0.3 - Feeds! Recent requests, upvotes, comments, recs

_December 2025_

Here we have added the bulk of the features that the architectural work of v0.2 was meant to make
possible for our small team to maintain a fully modern approach that meets very high standards for
a native-feeling mobile app, while adding on a big surface area of interactive features: a social
media style feed with comments, votes, different feeds/algos, etc.

You can [view new features and views in the screenshots posted on the PR](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683). They include:

- The language requests feed is now much more like a social media feed, with request posts, top-
  level comments, and replies.
- Comments and replies can have up to 4 card recommendations, which are treated as proposed
  "answers" to the request.
- We currently have feeds for "most recent" and "friends", and have a disabled teaser option for
  "most popular" to indicate the direction we plan to go with this in the near future.

[Style work and visual language enhancements are also shown and detailed in the PR.](https://github.com/mhsnook/sunlo/pull/252#issuecomment-3679066683)

## 0.2 - Social Features and New Data Management

_November 2025_

Since April we have added direct messages, realtime connections for friend requests, alert badges
to help users discover features and important interactions.

We have opened up a new feature realm with the addition of "Phrase Requests", allowing users to
describe a situation and what they want to communicate, and ask native speakers to answer with a
flash card that will prepare them for similar situations in the future. This "requests" concept
provides a cross-language meta-layer, describing what linguists call "messages" (the actual _thing_
you want to convey), which mirrors the way people actually learn languages in the real world: by
asking a friend or colleague who speaks the language already, "Hey, when I want to hail a cab, what
do I say?"

In the next phase, this "Requests" concept will become the basis for additional social features,
and will allow us to identify _across all languages_ which types of cards will be most useful for
learners of other languages, to help us make the most out of our crowd-sourcing model, so that work
put into one language can be used to ease the path for others.

To make these more interactive and more social features perform better on device, and require less
bandwidth and re-fetching from the server, this version include a major upgrade to the way
data is fetched and stored on device, using Tanstack DB's live queries for all data in the app.

- Preloads almost the entire database in route loaders (we will replace this soon with more precise
  partial loaders, added in a recent version but not needed yet).
- Local DB _Collections_ store normalised copies of data, backed by Zod schemas.
- `useSomeData` style hooks are now based on `useLiveQuery` which allows us to join and filter data,
  and, importantly, to calculate aggregate data this way so we can replace postgres-view-based
  aggregation and have our aggregates automatically respond to any inserts into the local database.
- Collections are initialised, populated, and invalidated/cleared differently to how the query
  cache worked, so we have to be more careful about race conditions on loading and logout.

To help us manage this new complexity, we have added Playwright for end-to-end testing, which pairs
well with the Schema-backed runtime validation of our Collections to test all interactions between
client and server.

- Use Playwright specs to orcestrate browser navigation through all main features of the app,
  particularly mutations.
- Use `both-helpers.ts` to query the DB as service role and evaluate the local collection and
  return both, then compare them in the spec.

## 0.1 - The MEP

_April 2025_

This release contains the minimum feature set for an enjoyable flash card-learning experience.

Users can create cards, add translations, and perform reviews with the Spaced Repetition system,
FSRS v5.0. Read more:

- [Wikipedia: Spaced Repetition](https://en.wikipedia.org/wiki/Spaced_repetition)
- [The FSRS Algorithm, Explain](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler) (with more links!)
