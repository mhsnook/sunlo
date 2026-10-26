# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user learns a language because of a person or a place in their life. The onboarding goals name the three situations: moving to a new place, connecting with family, or visiting. These learners want phrases they can say to real people soon, not a course to complete.

The second audience is the fluent friends and family around that learner. They answer phrase requests, send phrases and playlists, confirm draft phrases, and practise alongside the learner. A fluent speaker of one language is often a learner of another, so one account plays both roles.

Profiles record each known language at one of three levels: `fluent`, `proficient`, or `beginner`.

## Product Purpose

Sunlo is a social flashcard app. A learner keeps a personal deck per language, reviews it on a spaced-repetition schedule, and fills it from a community phrase library and from the people they know. Success means a learner can say the things they need to say to the people and places that made them start, and the people who already speak the language helped get them there.

## Positioning

Two mechanisms set Sunlo apart, and the product leans on them together:

- **Help from people you know.** Friends and family send phrases, answer requests, and practise with you. Learning is social by design, not a leaderboard bolted onto a solo course.
- **Crowd-sourced practical phrases.** The library holds phrases people actually say. Learners ask for a phrase with a request, the community answers in comments, and fluent speakers confirm drafts. Playlists collect phrases from songs, videos, and other media.

FSRS spaced repetition is the memory engine underneath. It matters to the product, but it is not the claim that separates Sunlo from Anki, Duolingo, or Memrise.

## Operating Context

- **Daily review:** short FSRS review sessions on a phone, in a 4-button or 2-button answer mode. "Today" turns over at 4am, not midnight, because some learners study after midnight.
- **Requests:** a learner asks how to say something in a language; people who know the language answer in comments and link phrases.
- **Library and playlists:** browse and search the public phrase library per language; collect phrases from media into playlists.
- **Friends and chat:** connect with people you know, send them phrases and playlists, and talk in chat.
- **Adding phrases:** one at a time, in bulk, or from a photo, where a vision model suggests phrases and anything the learner does not confirm saves as a draft until a fluent speaker confirms it.
- **Feed and notifications:** activity from friends and the language community.
- **Community norms:** every new member agrees to them before using the app. They ask members to be kind and patient, share what they actually know, respect cultures, credit native speakers, and flag content that seems wrong.

The seed data leans towards Indian languages (Hindi, Tamil, Kannada, Marathi), with French, Spanish, and German also present, and the homepage examples use Kannada and Punjabi. The language list in `src/lib/languages.ts` has 183 ISO 639-3 codes.

## Capabilities and Constraints

- Phone browser first. Most use is on phones; desktop is secondary. There is no native app.
- Local-first: writes appear immediately and sync in the background, and live data streams in over realtime channels.
- Content is user-generated, and removals are soft deletes, so removed comments leave a tombstone.
- Privacy is enforced by row-level security; an admin read never sees message bodies.
- Terminology in the product: deck, card, phrase, translation, request, comment, playlist, review, friend, fluent speaker.

## Brand Commitments

- **Name and mascot:** Sunlo, with a garlic mascot. Assets live in `public/images/` (`garlic-logo.svg`, `square-logo.svg`, `logo-pair.png`, `garlic*.png`) and `public/app-icon.png`.
- **Free for individual learners, forever.** Design work never adds paywalls, premium tiers, or upsell surfaces for learners.
- **Open source.** The code is public domain (Unlicense).
- **Voice:** warm, plain, and community-minded, as in the community norms. "Remember there's a real person on the other end."
- **Contact:** sunloapp@gmail.com and `bsky.app/profile/sunlo.app`.

## Evidence on Hand

- The community norms copy in `src/components/intros/community-norms-intro.tsx`.
- Real usage figures (active and new users, deck and library activity) are available from the admin dashboard in `apps/admin`.

Absences that future work must not fabricate:

- No verified user counts, verification counts, contribution rates, or "thousands of learners" claims. The homepage numbers ("Verified by 127 users", "5+ active learners", and similar) are placeholders: do not reuse them, and replace them with admin-dashboard figures or remove them.
- No retention statistics. The "up to 200% retention" claim on the homepage is unverified.
- No AI personalisation claim for scheduling. FSRS is a published spaced-repetition algorithm, not "our AI".
- No testimonials, press, or case studies exist yet.

## Product Principles

1. **A real person is on the other end.** Every social surface should make it easier to ask someone you know, answer someone, or thank them.
2. **Practical over textbook.** Favour phrases people say to each other in real situations, and show who confirmed them.
3. **Truth over proof.** Show real numbers or none. Trust is the community's currency, so invented social proof costs more than it buys.
4. **Free means free.** No learner-facing feature sits behind payment, and no surface nudges towards one.
5. **Built for a phone in a hand.** A review session or a request answer should work in a spare minute on a small screen.

## Accessibility & Inclusion

- A dyslexia-friendly font option exists under display preferences.
- Layout uses logical `start`/`end` directions so right-to-left scripts work.
- Phrases appear in many scripts (Devanagari, Tamil, Kannada, Gurmukhi, Arabic, Latin), so type and spacing must hold up across all of them.
