import { defineTeam } from '@scenetest/scenes'

// Sunlo Default — the original team. Three-tier language model:
//   lang_full    = well-populated (Hindi): rich phrases, requests, playlists,
//                  and the learner has a deck with cards for review tests.
//   lang_partial = moderately populated (Kannada): smaller seed; used for
//                  request CRUD, comment threads, and most "create new"
//                  flows that need the lang to already exist on the learner.
//   lang_empty   = no learner deck, no seeded phrases (Bangla). Used by the
//                  "create a new deck" flow.
//
// All tag UUIDs below are seeded in supabase/seed.sql, supabase/seed-v018-extras.sql,
// and supabase/seed-comments.sql. A second team (team2) mirrors the same tag
// shape with French / Spanish / Basque, seeded in supabase/seed-team2.sql.
export default defineTeam({
	name: 'Sunlo Default',
	tags: {
		// Three-tier language model
		lang_full: 'hin',
		lang_partial: 'kan',
		lang_empty: 'ben',
		lang_full_name: 'Hindi',
		lang_partial_name: 'Kannada',
		lang_empty_name: 'Bangla',

		// Phrases
		// Partial-lang phrase the learner has a card for; used to walk
		// card-status transitions in learn.spec.md.
		partial_phrase_with_card: 'aa110006-6666-4aaa-bbbb-cccccccccccc',
		// Partial-lang phrase the learner has NO card for; used by the
		// "add to deck" flow in learn.spec.md and by admin-phrases.spec.md.
		partial_nocard_phrase: 'aa110007-7777-4aaa-bbbb-cccccccccccc',
		// Partial-lang phrase searchable from the phrase picker by the
		// substring `partial_attach_phrase_search`. Used in comment-crud
		// (friend attaches it to a comment) and phrase-edit-tags-translations.
		partial_attach_phrase: 'b0fbbe1d-705e-4d93-a231-ac55263fcfee',
		partial_attach_phrase_search: 'dosa',
		// Phrases that appear in the new-playlist phrase picker for each lang.
		full_picker_phrase: '2fbae84f-5b1d-43c2-8927-ef4d41c7e794',
		partial_picker_phrase: 'b9e3edac-de8b-4796-b436-a0cded08d2ae',
		// Test inputs for "create a phrase" flows. Native string is in lang_full
		// (Hindi here, French for team2); translation is English.
		full_test_phrase_text: 'नमस्ते दोस्तों',
		full_test_phrase_translation: 'Hello friends (test)',

		// Requests
		// Learner's full-lang request that friend comments on; thread already
		// has a friend comment seeded.
		full_request_for_comments: '3f8c9e2a-1234-4567-89ab-cdef01234567',
		// Learner's partial-lang request that learner3 answers (comments-and-answers).
		partial_request_for_answers: '6c1f2a5d-4567-4890-a2de-f01234567890',
		// Learner2's partial-lang request that learner upvotes.
		partial_request_for_upvote: '4a9d0f3b-2345-5678-90bc-def012345678',
		// Partial-lang request used by comment-crud.spec.md and requests.spec.md.
		// Must exist and be open for friend + learner to comment on.
		partial_crud_request: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		partial_crud_request_prompt: 'How do I order a dosa and a coffee?',
		// Full-lang request shared from learner2 to learner in chat;
		// drives phrase-from-chat-request.spec.md.
		full_shared_chat_request: 'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		// Test phrase pairs used by phrase-from-chat-request scenes when the
		// learner creates a new full-lang phrase inline. The form takes a
		// `phrase-text-input` (becomes phrase.text — English source here) and
		// a `translation-text-input` (becomes phrase_translation.text in
		// lang_full). Two pairs because the spec runs two scenes with
		// different inputs.
		full_chat_phrase_a_text: 'What time is it?',
		full_chat_phrase_a_translation: 'Kitne baj rahe hain?',
		full_chat_phrase_b_text: 'Hello friends',
		full_chat_phrase_b_translation: 'Namaste doston',

		// Playlists
		// Learner's full-lang playlist edited in playlists.spec.md.
		full_playlist_for_edits: 'a1b2c3d4-1111-4222-a333-444444444444',
		full_playlist_for_edits_title: 'Essential Hindi Greetings',
		full_playlist_for_edits_description:
			'Common greetings and polite phrases for everyday conversations in Hindi',
		// Featured partial-lang playlist appearing in feed and on the
		// playlists list; used in feed.spec.md and playlists-hin-kan.spec.md.
		partial_featured_playlist: 'c3d4e5f6-3333-4444-a555-666666666666',

		// Comments
		// Seeded comment under [team.full_request_for_comments]; used as a
		// reply target in comments-and-answers.spec.md.
		full_seed_comment: 'c0000005-5555-4666-8777-888888888888',
		// Seeded comment on [team.partial_crud_request]; used as a reply
		// target in comment-crud.spec.md.
		partial_crud_reply_target_comment: 'c0000003-3333-4444-8555-666666666666',
		// Learner's own comment on [team.partial_crud_request]. Preserved by
		// comment-crud cleanup (.neq()) so it can serve as a reply target.
		// Also visible on /learn/$lang/contributions in comments-and-answers.
		partial_learner_seed_comment: 'c0000004-4444-4555-8666-777777777777',
		partial_learner_seed_comment_text: 'Vandu tea kudhi',
		// Seeded learner2 comment on [team.partial_crud_request], with a
		// phrase link AND upvote_count > all siblings so it sorts FIRST in
		// the live query (orderBy upvote_count desc). comment-crud.spec.md
		// asserts friend's own badge as `comment-phrase-link-badge #2`.
		partial_phrase_linked_seed_comment: '800d41d1-3161-4a22-9d6f-dd0dcb29374a',
	},
	actors: {
		visitor: {
			key: undefined!,
		},

		// Fresh signup; expected to have NO decks, phrases, requests, or comments.
		// Used to exercise onboarding flows.
		'new-user': {
			email: 'sunloapp+new@gmail.com',
			password: 'password',
			key: 'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		},

		// Primary test user. Seeded with rich data across multiple decks.
		// Decks (user_deck): aka(archived), tam, hin, ibo, kan
		// (NOT spa or ben — those are reserved for "create new deck" flows.)
		// Phrase requests (5):
		//   partial_crud_request           = e40e53ce (kan: dosa+coffee)
		//   partial_request_for_answers    = 6c1f2a5d (kan: directions)
		//   full_request_for_comments      = 3f8c9e2a (hin: cooking ingredients)
		//   tam request                    = bc2e2811 (favourite food)
		//   ibo request                    = 26fc0561 (cab driver)
		// Playlists (3):
		//   full_playlist_for_edits        = a1b2c3d4 (hin Greetings)
		//   partial_featured_playlist      = c3d4e5f6 (kan Basics)
		//   hin Travel Phrases             = f6a7b8c9
		// Comments authored:
		//   partial_learner_seed_comment   = c0000004 on partial_crud_request
		//   c0000007                       on hin request 5b0e1a4c
		learner: {
			email: 'sunloapp@gmail.com',
			password: 'password',
			key: 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
			username: 'GarlicFace',
			localStorage: {
				'sunlo-intro-review': 'seen',
				'sunlo-intro-deck-new': 'seen',
				'sunlo-intro-community-norms': 'affirmed',
			},
		},

		// Secondary actor for multi-user flows (friend requests, comments, chat).
		// Phrase requests (1): hin 5b0e1a4c (declining food politely)
		// Playlists (1): hin d4e5f6a7 (Numbers and Counting)
		// Comments authored:
		//   c0000001 on hin request e0d3a74e (= full_shared_chat_request)
		//   c0000006 on partial_request_for_upvote (4a9d0f3b)
		// Friendships: friends-with learner (chat seeded; see chat_message
		// rows in seed.sql).
		friend: {
			email: 'sunloapp+friend@gmail.com',
			password: 'password',
			key: '7ad846a9-d55b-4035-8be2-dbcc70074f74',
			username: 'Lexigrine',
		},

		// Tertiary actor; comments + replies.
		// Comments authored:
		//   c0000002 (reply on hin e0d3a74e = full_shared_chat_request)
		//   c0000003 = partial_crud_reply_target_comment (on partial_crud_request)
		//   full_seed_comment       = c0000005 (on full_request_for_comments)
		//   partial_phrase_linked_seed_comment = 800d41d1 (on partial_crud_request)
		// Friendships: friends-with learner; shared full_shared_chat_request
		// in chat thread.
		learner2: {
			email: 'sunloapp+1@gmail.com',
			password: 'password',
			key: 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
			username: 'Best Frin',
		},

		// Used for answer/phrase-link flows in comments-and-answers.spec.md.
		// No comments seeded; tests create them then clean up by [testStart].
		// Has hin and kan decks for webkit cross-actor tests.
		learner3: {
			email: 'sunloapp+2@gmail.com',
			password: 'password',
			key: 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
			username: 'Work Andy',
		},
	},
})
