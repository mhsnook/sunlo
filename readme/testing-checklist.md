# Testing Checklist

- [x] Checked items mean we have e2e tests for this

## Test rpc forms

These are forms that submit to an RPC function, meaning that our typescript types might not
fully cover the possible inputs and outputs of the function. We need to test these forms
with realistic inputs and edge cases, and ensure that we are able to insert or update records in
our local collection.

- [x] new phrase / card / translation
- [ ] bulk add phrases
- [ ] insert card review
- [ ] update card review
- [ ] fulfill_phrase_request

## Collections based on views where we insert rows after create

These are collections where the initial query pulls from a view, meaning that a record returned
from the insert statement won't necessarily match it, so when we parse it with a Zod schema in
order to insert into the local collection, we need to do a special check to ensure the parsing
logic results in a record that matches the schema.

- [ ] `decksCollection`: `DeckMetaSchema` parse a new row from `user_deck` to match a `user_deck_plus` and insert it in the local collection
- [ ] `decksCollection`: `DeckMetaRawSchema` parse an updated row from `user_deck` and update it in the local collection
- [x] `phrasesCollection`: `PhraseFullSchema` parse a new row from `phrase` and match a `meta_phrase_info(*, translations)`
- [x] `cardsCollection`: `CardMetaSchema` parse a new row from `user_card` and match a `user_card_plus`
- [ ] `friendSummariesCollection`: `FriendSummarySchema` parse a new row from `friend_request_action` and match a `friend_summary`

## Mutations to check

This is a list of all the mutations in the codebase. They all need to be tested using realistic
inputs and edge cases.

- [ ] add-tags.tsx: 57: `addTagsMutation`
- [ ] add-translations-dialog.tsx: 51: `addTranslation`
- [ ] card-status-dropdown: 107: `useCardStatusMutation`
- [ ] password-reset-form.tsx: 24: `changeMutation`
- [ ] send-phrase-to-friend-button.tsx: 34: `sendPhraseToFriendMutation`
- [ ] send-request-to-friend-dialog.tsx: 30: `sendRequestToFriendMutation`
- [ ] use-friends.ts: 62: `useFriendRequestAction`
- [ ] use-reviews: 151: `useReviewMutation`
- [ ] hooks.ts: 23: `useSignOut`
- [ ] mutate-deck.ts: 28: `useNewDeckMutation`
- [ ] forgot-password.tsx: 31: `recoveryMutation`
- [x] login.tsx: 45: `loginMutation`
- [ ] signup.tsx: 56: `signupMutation`
- [ ] accept-invite.tsx: 51: `acceptOrDeclineMutation`
- [ ] getting-started.tsx: 90: `mainForm`
- [ ] chats.$friendUid.recommend.tsx: 42: `sendMessageMutation`
- [ ] -archive-deck-button.tsx: 36: `mutation`
- [x] $lang.add-phrase.tsx: 101: `addPhraseMutation`
- [ ] $lang.bulk-add-tsx: 96: `bulkAddMutation` – works with multiple phrases with multiple translations (and shows the results below)
- [ ] $lang.deck-settings: 114: `updateDailyGoalMutation`
- [ ] $lang.deck-settings: 226: `updateDailyGoalMutation`
- [ ] $lang.requests.$id.tsx: 81: `fulfillMutation`
- [ ] $lang.requests.new.tsx: 61: `createRequestMutation`
- [ ] $lang.review.index.tsx: 186: in `ReviewPageSetup`
- [ ] -avatar-editor-field.tsx: 53: `sendImage`
- [ ] -update-profile-form.tsx: 40: `updateProfile`
- [ ] change-email.tsx: 31: `changeMutation`

## Funny Auth/Loading issues to check

These are issues that I have encountered while testing the app and need to be checked. They are
important for end-to-end testing because they involve the overlap of synchronously initializing the client, applying a useEffect and an event listener, rendering the router and assigning the
router context, and then fetching data from the server before encountering a router loader.

- [x] SignIn never shows an un-auth'd or no-profile FOUC or redirect
- [x] Cannot manage to trigger an infinite-loader even with different cache states and conx throttling
- [x] Route loaders suspend until loaded (No flashes of empty content; useProfile checks in Route components never return false)
- [ ] Logout removes profile and other user data
- [x] Login fetches new profile and user data

## Checking logic under the hood

This is a list of things that I have encountered while testing the app and need to be checked. In
these examples, the user doesn't get direct feedback in the UI as to whether the correct action
has been taken, so we need to directly inspect either the mutation's return values or the contents
of the database.

- [ ] Reviews can be edited (without creating new reviews)
- [ ] Second reviews get marked with new records but with the prev values and day_first_review=false
