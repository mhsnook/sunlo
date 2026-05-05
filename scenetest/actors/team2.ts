import { defineTeam } from '@scenetest/scenes'

// Sunlo Team 2 — French / Spanish / Basque mirror of the default team. Same
// three-tier language model, same actor roles, same tag shape, so every scene
// that runs against the default team can also run against this team. Seeded
// in supabase/seed-team2.sql.
export default defineTeam({
	name: 'Sunlo Team 2 (FR/ES/EU)',
	tags: {
		// Three-tier language model
		lang_full: 'fra',
		lang_partial: 'spa',
		lang_empty: 'eus',
		lang_full_name: 'French',
		lang_partial_name: 'Spanish',
		lang_empty_name: 'Basque',

		// Phrases
		partial_phrase_with_card: 'ff110006-6666-4aaa-bbbb-cccccccccccc',
		partial_nocard_phrase: 'ff110007-7777-4aaa-bbbb-cccccccccccc',
		partial_attach_phrase: 'f0fbbe1d-705e-4d93-a231-ac55263fcfee',
		// 'sopa' surfaces partial_attach_phrase in the picker (Spanish for soup).
		partial_attach_phrase_search: 'sopa',
		full_picker_phrase: 'f2bae84f-5b1d-43c2-8927-ef4d41c7e794',
		partial_picker_phrase: 'f9e3edac-de8b-4796-b436-a0cded08d2ae',
		full_test_phrase_text: 'Bonjour les amis',
		full_test_phrase_translation: 'Hello friends (test)',

		// Requests
		full_request_for_comments: 'f3f8c9e2-1234-4567-89ab-cdef01234567',
		partial_request_for_answers: 'f6c1f2a5-4567-4890-a2de-f01234567890',
		partial_request_for_upvote: 'f4a9d0f3-2345-5678-90bc-def012345678',
		partial_crud_request: 'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		partial_crud_request_prompt: '¿Cómo pido una sopa y un café?',
		full_shared_chat_request: 'f0d3a74e-4fe7-43c0-aa35-d05c83929986',
		full_chat_phrase_a_text: 'What time is it?',
		full_chat_phrase_a_translation: 'Quelle heure est-il?',
		full_chat_phrase_b_text: 'Hello friends',
		full_chat_phrase_b_translation: 'Bonjour les amis',

		// Playlists
		full_playlist_for_edits: 'f1b2c3d4-1111-4222-a333-444444444444',
		full_playlist_for_edits_title: 'Essential French Greetings',
		full_playlist_for_edits_description:
			'Common greetings and polite phrases for everyday French conversations',
		partial_featured_playlist: 'f3d4e5f6-3333-4444-a555-666666666666',

		// Comments
		full_seed_comment: 'f0000005-5555-4666-8777-888888888888',
		partial_crud_reply_target_comment: 'f0000003-3333-4444-8555-666666666666',
		partial_learner_seed_comment: 'f0000004-4444-4555-8666-777777777777',
		partial_learner_seed_comment_text: 'También puedes pedir un té',
		partial_phrase_linked_seed_comment: 'f00d41d1-3161-4a22-9d6f-dd0dcb29374a',
	},
	actors: {
		visitor: {
			key: undefined!,
		},

		'new-user': {
			email: 'sunloapp+t2-new@gmail.com',
			password: 'password',
			key: '2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8',
		},

		// Decks: tam(archived analogue), spa, fra (NOT eus).
		// Mirrors team-1 learner's data shape in fra (full) and spa (partial).
		learner: {
			email: 'sunloapp+t2@gmail.com',
			password: 'password',
			key: '21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
			username: 'GarlicTongue',
			localStorage: {
				'sunlo-intro-review': 'seen',
				'sunlo-intro-deck-new': 'seen',
				'sunlo-intro-community-norms': 'affirmed',
			},
		},

		friend: {
			email: 'sunloapp+t2-friend@gmail.com',
			password: 'password',
			key: '27ad846a-d55b-4035-8be2-dbcc70074f74',
			username: 'Lexigrande',
		},

		learner2: {
			email: 'sunloapp+t2-1@gmail.com',
			password: 'password',
			key: '22dfa256-ef7b-41b0-b05a-d97afab8dd21',
			username: 'Mejor Amigo',
		},

		learner3: {
			email: 'sunloapp+t2-2@gmail.com',
			password: 'password',
			key: '2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
			username: 'Office Pierre',
		},
	},
})
