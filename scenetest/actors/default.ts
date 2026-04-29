import { defineTeam } from '@scenetest/scenes'

export default defineTeam({
	name: 'Sunlo Default',
	owns: ['/learn', '/friends'],
	tags: {
		lang: 'kan',
		// A seed phrase (seed-v018-extras.sql) in [team.lang] that the learner has no card for.
		// Used in learn.spec.md "learner adds a phrase to their deck".
		nocard_phrase: 'aa110007-7777-4aaa-bbbb-cccccccccccc',
		// A seed comment on the Hindi request used in comments-and-answers.spec.md.
		seed_comment: 'c0000005-5555-4666-8777-888888888888',
		// Request in [team.lang] used by comment-crud.spec.md. Must exist and be
		// open for friend + learner to comment on.
		comment_crud_request: 'e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		// Seeded phrase-linked comment on [team.comment_crud_request], owned by learner2.
		// Required invariants for comment-crud.spec.md:
		//   1. Has a comment_phrase_link row attached.
		//   2. upvote_count > all sibling comments on the request, so it sorts FIRST
		//      in the live query (orderBy upvote_count desc). Currently set to 5,
		//      while the next-highest sibling sits at 3. Don't lower this.
		// The spec then asserts friend's own badge as `comment-phrase-link-badge #2`.
		phrase_linked_seed_comment: '800d41d1-3161-4a22-9d6f-dd0dcb29374a',
		// A phrase in [team.lang] that friend attaches to their comment in
		// comment-crud.spec.md. Must be searchable from the phrase picker by
		// the substring 'dosa'.
		attach_phrase: 'b0fbbe1d-705e-4d93-a231-ac55263fcfee',
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
		// Decks (user_deck): hin, kan, tam, ibo, spa
		// Phrase requests (5): kan e40e53ce (dosa+coffee), kan 6c1f2a5d (directions),
		//   hin 3f8c9e2a (cooking ingredients), tam bc2e2811 (favourite food),
		//   ibo 26fc0561 (cab driver)
		// Playlists (3): hin a1b2c3d4 (Greetings), kan c3d4e5f6 (Basic Kannada),
		//   hin f6a7b8c9 (Travel Phrases)
		// Comments authored: c0000004 on kan request e40e53ce ("Vandu tea kudhi"),
		//   c0000007 on hin request 5b0e1a4c ("nahi, dhanyavaad")
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
		// Comments: c0000001 on hin request e0d3a74e, c0000006 on hin 4a9d0f3b
		friend: {
			email: 'sunloapp+friend@gmail.com',
			password: 'password',
			key: '7ad846a9-d55b-4035-8be2-dbcc70074f74',
			username: 'Lexigrine',
		},

		// Tertiary actor; comments + replies.
		// Comments: c0000002 (reply on hin e0d3a74e), c0000003 (kan e40e53ce),
		//   c0000005 = team.seed_comment (on hin 3f8c9e2a),
		//   800d41d1 = team.phrase_linked_seed_comment (on team.comment_crud_request)
		learner2: {
			email: 'sunloapp+1@gmail.com',
			password: 'password',
			key: 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
			username: 'Best Frin',
		},

		// Used for answer/phrase-link flows in comments-and-answers.spec.md.
		// No comments seeded; tests create them then clean up by [testStart].
		learner3: {
			email: 'sunloapp+2@gmail.com',
			password: 'password',
			key: 'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
			username: 'Work Andy',
		},
	},
})
