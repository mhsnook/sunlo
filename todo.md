NEW DATA ISSUES TO FIX LATER

- when friend requests come in we refetch the entire thing friend summaries collection instead of using live queries

DB WORK RELATED TO TANSTACK DB

1. Some strange issue happening only in dev mode where the thing just waits for auth state for forever
1. replace the friend requests complexity with an RPC function

USER TESTING FIXES

1. malformed link like /learn/undefined should 404, or at least say 'do you wanna start learning this?'
   - at least we should validate this parameter has length === 3 to even match it
1. When you try to sign up using existing creds you get an error and then get logged in. We
   should handle this. (inspect and special-case the error before throwing, and toast accordingly)

EPIC: Postgres DX / Run Supabase Locally

1. make the email stuff work with the local setup
1. pgTap set up testing framework / run tests on the RPC functions: https://supabase.com/docs/guides/database/extensions/pgtap
1. ✅ switch to v8
   - test out pglinter?
1. future:
   - use postmark templates like [this](https://github.com/supabase/auth/issues/304#issuecomment-998029660)

EPIC OF SIGNUPS AND GETTING STARTED AND CONNECTING FRIENDS

1. add "copy invitation text" to invite page
1. ~make the signup email nice~
1. the getting-started flow:
   - ✅ friends get an accept-friendship page
     - ✅ Build this "accept-one-particular-invite" page
     - ✅ original invite needs to embed the friend's uid
     - ✅ grab the url argument and save it when the temp user is created
     - ✅ detect the friend uid in the user object for the first-redirect after getting-started

EDGE CASES LEFT BEHIND

1. When you reach the getting-started page with no "user role" set
   - rn the redirect pretends you're a helper
   - we should probably ask ppl instead
1. ✅ If you hack the client it's possible to "Accept" an invitation that hasn't been sent;
   the RLS can reject these and/or the friend_summary view can check and verify the who sequence.
   Both of these options seem secure, and they won't conflict.
   - replace this RLS hack with an RPC
1. ✅ build some "info" page for public profles/Friends
   - ✅ should be able to unfriend them
   - ✅ should be able to see their phrases and requests

MOCKS / Incompletes

1. ✅ The "Deck Home" screen or Welcome Screen
   ✅ Deck overview section, recent reviews and such - wire it up
   ✅ Friends activity ?? (maybe doesn't belong here) - wire it up - move the Quick Search link into the navbar??
1. ✅ $lang/library needs a search bar added to filter in realtime
1. ✅ The "new friend signup" screens -- what are we doing here? selecting which deck(s) we're helping with... and then what?
1. Public Library is a special browsing experience that needs to be built!
   1. $lang/library has this "recently reviewed" filter which probably should be a field on the user_card_plus view
   1. $lang/index needs the review overview graph thing made

CARD INTERACTIONS

1. ✅ make the "add to deck" function work
   - ✅ or no deck (start learning this language)
   - or not logged in (login)
1. deeper interactions with cards:
   - when we open these accordion things, should we open a whole dialog or a drawer? or have a button that opens the whole dialog?
   - ✅ $lang/library/$pid perhaps should be built which permalinks to the same thing as goes in the dialog
   - ✅ add translations button must work
1. "suggest edits to this card"
   - Plan: Allow any logged-in user to submit a change to the `edit_suggestions` table.
1. "edit" feature for editing translations and phrases. a user deck assigns the user's relationship to the language, are they no-relation, curious, learner, friend, teacher, or editor. in this example, editor is the high mark, like an admin.
   - Plan: Users with `editor` role can directly modify records, which calls an `update_*` RPC.
1. "edit history" where you can see the previous edits and timestamps and who edited them.
   - Plan: Create `phrase_versions` and `translation_versions` tables. Edits will create a new version record. A "History" tab will be added to the card UI.

UI POLISH

1. Full multilingual text search:
   - PGroonga: https://supabase.com/docs/guides/database/extensions/pgroonga
   - fulltext search without accents: https://www.postgresql.org/docs/current/unaccent.html
   - ⛔ fuzzy string match that only works well with american names: https://www.postgresql.org/docs/current/fuzzystrmatch.html
1. This chat's features: https://v0.dev/chat/animated-card-interface-MHacnAB0fOp
   1. slide the cards in and out horizontally
   1. give us a completion progress bar in the /review interface
1. when the router loader is suspending and then stops, transition in
1. ✅ replace my multi-language select with https://craft.mxkaske.dev/post/fancy-multi-select

OTHER IDEAS

1. a app shortcut that opens straight into new-card interface
1. take a picture, do OCR on it, let people create a card directly from the real world
1. Prettier URLs? with hashIDs (can hash the uuid): https://supabase.com/docs/guides/database/extensions/pg_hashids

ONGOING DATA-HEALTH PRUNING/CURING

1. For any of the RPC function we should set some permissions:
   `sql
revoke execute on function public.hello_world from public;
revoke execute on function public.hello_world from anon;
-- grant execute on function public.hello_world from authenticated;
`
