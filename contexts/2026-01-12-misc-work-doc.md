# Sprint Doc

WORKING BRANCH: `2026-01-10-general`.

Completed items:

- [x] (c1, d1) Fix: Loading spinner creating scrollbars
- [x] (c3, d2) Add: react compiler, remove linter cruft
- [x] (c1, d1) Chore: Remove these console logs `We expected a userId here`
- [x] (c1, d1) Fix: convert the PlusMenu to standard shadcn menu
- [x] (c1, d1) Design: Try font "Instrument Sans"
- [x] (c1, d1) Design: Use Bookmark\* icons to card status
- [x] (c1, d1) Changing card status updates the phrase's metadata (count_learners) etc

## Instructions for the Coding Agent

1. Please start by picking one item from the list below with `STATUS: PENDING` or `STATUS: READY` that looks simple and does not require any explanation or interaction with other issues. If the item contains an ISSUE or PR number, use the `gh` cli to read the information from github. All items will be found in `https://github.com/mhsnook/sunlo/...`, which is also the remote `origin`.
2. Attempt to resolve the issue or complete the feature, writing tests and using the formatter and linter to validate your work.
3. Each item lists a "COMPLEXITY" score from 1 to 4. This should tell you how much effort we think you should be putting in to each try.
   1. If an item feels like a `COMPLEXITY: 4` or `DIFFICULTY: 4` then please create a new document for it in the format `YYYY-MM-DD-{project-name}-project-doc.md`, move your thoughts from this document to that one, and just leave a note here saying "this looked like a `size=4` so I moved it.
   2. For items that look like a 1, 2, or 3, try them up to 3x before giving up; mark the item `STATUS: BLOCKED` and leave a comment.
   3. Use the existing test framework, with `pnpm run test` to confirm your work didn't break anything, but if there are pre-existing broken tests that prevent you from being sure, simply leave a note and move on. You can spend a little time trying to clean up adjacent tests, but do not go too far out of scope.
   4. You can use your own browser to click through and test the feature. You can write tests based on your successful navigation. You can add `data-testid` and related attributes throughout the app's JSX components to make all this easier. Never use `page.goto`. Not all tests need to be `mutation` tests; you can also just use them to click around and ensure things navigate and show up as we would expect.
   5. If you need to ask questions to the human engineering manager, simply add them to the document along with the item below, and skip the item, marking it `STATUS: QUESTIONS`.
4. When you have finished an item, update the status or reached the retry limit, or determined that you require more clarification from the human manager, write a note in the document along with the item, and next to the `COMPLEXITY` rating, record _your own score_ for `DIFFICULTY`, based on your own experience working on, researching and analysing the item. Once you have this note you can move on and we will be able to forget about the discussion later but retain the relevant details in the log.
5. If you have completed the task, perform a git commit with a concise summary of the work. If the task involves migrations, put it on another branch with the format: `2026-01-10-{concise-item-name}`, commit it over there, and then return to today's working branch before continuing. Finally, add a commit-message sized description in the list at the top of the document.
6. Go back to step 1 for as long as there are more PENDING items.

## Items to Work On

### Feature E: Friends feed and Popular feed should become polymorphic like the recent feed, and Filters should work there too

STATUS: PENDING
COMPLEXITY: 2

### Fix F: the PlusMenu is not keyboard navigable. We should switch to standard ShadCN menu.

STATUS: PENDING
COMPLEXITY: 1

### COMPLETED: Fix G: When the loading spinner spins, e.g. on /friends suspending for the loader, the way the Loader spins creates x and y scrolls that come and go

STATUS: COMPLETED
COMPLEXITY: 1
DIFFICULTY: 1

NOTE: The router's fallback loading component wasn't using the standard Loader component; switching to that fixed it.

### Feature Research H: User Consents and GDPR

STATUS: PENDING
COMPLEXITY: 1 or 3

HUMAN MANAGER COMMENT: Now that we have a "public mode" we have an increased responsibility and urgency around implementing some more explicit permissions and consents. For example, the privacy policy in `privacy-policy.tsx` specifies that phrases and translations will be public, but we should make this more clear that e.g. comment threads, requests and playlists are also part of the public resources. Which cards you're learning and your review history are private, but many of these other things can be read by the public. Giving some checkbox notification of this, on the signup form, should be a simple client-side change (complexity 1).

And in time we also need to implement some GDPR compliance, which means having a model for consents and consent-agreement actions that can be tied back to the version of the policy that was being consented to. Which means probbly moving the privacy policy into the database as markdown and versioning it and so on. This will be a much more involved project than simply better notifying the users about sharing information in public, and should be well thought out before we begin.

### Feature I: Sign in with Google Auth

STATUS: Pending
COMPLEXITY: 2

HUMAN MANAGER COMMENT: This may require some back-and-forth with Supabase setup and configuration, and then writing code. And we may need to give individuals a way to switch from password-auth to google-auth.

### DX J: Explain what it would take to set up GH Actions to run tests

STATUS: Pending
COMPLEXITY: 2

HUMAN MANAGER COMMENT: This may look like a complexity 1 ("set up a github action") but we have to be very careful never to run the tests against the production branch. We need to run them against the `next` branch and against PRs targeting `next` and against any deployment PRs (from `next` to `main`). The action needs to be able to use secrets that are synced from Supabase's branch management system, or if that proves to complex, use secrets that work for the `next` branch, and use supabse's persistent `next` branch to achieve the best coverage within our limitations. Please collect a few reasonable options and present them. Go with a minimal solution that works first; a basic POC that is safe and reliable and uses the `next` branch only, and we can do that first, and then we'll work on better test reliability (or else our new CI pipeline will shut down all deployments!) and then we'll think about other DX improvements in a later scope of work. Don't make any code changes yet; simply write a plan in this doc.

### DX K: A set of tests that don't make database changes; ignores the `mutations` folder and uses a different `navigations` folder which just steps through the app, allowing decs to run these tests frequenty without a db reset, using `pnpm test no-db`

STATUS: Pending
COMPLEXITY: 2

NOTE FROM HUMAN MANAGER: We can mostly copy the navigation commands from existing "mutations" tests, and just leave out the form stuff. And we can just click around key workflows and make sure everything works. Maybe you have a smart way of just "crawling" the app from both logged-in and logged-out perspectives and spotting anything unusual.

### Feature L: Browse page needs a big "search" box up at the top

STATUS: Pending
COMPLEXITY: 1

NOTE FROM HUMAN MANAGER: The "browse" page is really kind of crying out for a "search" box right there up at the top which searches all the phrases and translations and requests and playlists in the local DB. See `phraseFull` collection's `searchableText` field for a head start on this (but playlists are not integrated there at this time).

### L. Fix: When you get login-requred intercepted on the add-phrase page and then log in, the sidebar does not update unless you refresh

STATUS: Pending
COMPLEXITY: 2

#### NOTE FROM HUMAN MANAGER

This login results in a whole bunch of this console warning from tanstack/db:

> [Live Query Error] Source collection 'my_profile' was manually cleaned up while live query 'live-query-4' depends on it. Live queries prevent automatic GC, so this was likely a manual cleanup() call.

And

> [Live Query Error] Source collection 'decks' was manually cleaned up while live query 'live-query-9' depends on it. Live queries prevent automatic GC, so this was likely a manual cleanup() call.

And so on.

### O. Fix: The view `meta_phrase_info` seems to be incorrectly reporting zeros for numbers like `count_active`, `count_learned`, `count_skipped`

STATUS: PENDING
COMPLEXITY: 2

NOTE FROM HUMAN MANAGER: This is a complex view and it's not clear when it started being broken. But it does appear to be broken now. While we're messing with this, we can actually remove `count_cards` because it is data we can derive from the other counts, and it is actually only used in one place where `count_learners` is more appropriate. Also please drop `added_by_profile` while you're in there, as it is no longer used (we do this join on the client now).

Also, while working on this, please recommend other ways that we might simplify this view. For example, the subquery with all the most recent reviews from every person; maybe this should be a materialized view that gets updated daily. Or maybe all of this aggregate metadata should be kept on a separate table! I don't know. What do you think?

### Q. Feature: Card Review interface should show a context menu with options: "Banish this card" or "I've learned this (don't show it any more)"

STATUS: PENDING
COMPLEXITY: 1

### R. Design: Make the default theme 'light' somehow

STATUS: PENDING
COMPLEXITY: 1

### S. Feature: Reverse Reviews

STATUS: Still defining the problem / desired behaviour
COMPLEXITY: 2

NOTE FROM HUMAN MANAGER: the card shouldn't always be shown on the front, should it? sometimes we need to see the translation and remember the phrase (or see the request??). What do you think?

### T. Fix: When you've never reviewed a thing, it says most recent review `1 mo ago`

STATUS: PENDING
COMPLEXITY: 1

NOTE FROM HUMAN MANAGER: could be a bug parsing `null` in the `ago` function in @src/lib/dayjs.ts.

### U. Fix: malformed links like /learn/undefined should 404

STATUS: PENDING
COMPLEXITY: 1

### V. Fix: When you try to "sign up" using credentials of an existing user, you get an error but then still get logged in. We should probably inspect these errors, and if it's this specific case, just log you in and don't throw the error/toast.

STATUS: PENDING
COMPLEXITY: 1

### W. Feature: Edit or soft-delete your own translations

STATUS: PENDING
COMPLEXITY: 2

NOTE FROM HUMAN MANAGER: This should be a simple update call (no RPC needed) to edit the translation item, and then we have to do a tiny bit of fanciness to update the local Phrase item with just the translation we've changed (or to remove it), and update the `phrase_translation` RLS so that archived/deleted rows don't show up. So it all seems very small but several layers must be done together.

### X. Chore: 1. Replace the friend request / accept / cancel logic with a dedicated RPC

STATUS: PENDING
COMPLEXITY: 2 (simple enough, but requires migrations and checking state/idempotence/edge cases (like both people sending requests at the same time))
