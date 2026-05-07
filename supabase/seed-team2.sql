-- Seed data for scenetest team 2 (FR/ES/EU).
--
-- Mirrors the resource shape of team 1 (see seed-team1.sql), using:
--   lang_full    = French (fra): rich corpus, learner has full deck with reviews
--   lang_partial = Spanish (spa): medium corpus, used for CRUD flows
--   lang_empty   = Basque (eus): no learner deck, for "create new deck" flows
--
-- The two teams run scenes concurrently against the same database; their
-- actor UUIDs, emails, and resource UUIDs are disjoint by construction.
-- All UUIDs here are referenced from scenetest/actors/team2.ts.
--
-- Actor UIDs (parsed by scripts/dump-new-seeds.ts):
-- @uid learner   21f1f69c-10fa-4059-8fd4-3c6dcef9ba18
-- @uid friend    27ad846a-d55b-4035-8be2-dbcc70074f74
-- @uid learner2  22dfa256-ef7b-41b0-b05a-d97afab8dd21
-- @uid learner3  2a32f65e-a496-4afc-abd3-798d8e6d9ec5
-- @uid new-user  2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8
--
set
	session_replication_role = replica;

--
-- auth.users — 5 actors mirroring team-1's roster.
-- Password hash is bcrypt of "password" (matches the team-1 password so the
-- shared 'login' macro works for both teams).
--
insert into
	"auth"."users" (
		"instance_id",
		"id",
		"aud",
		"role",
		"email",
		"encrypted_password",
		"email_confirmed_at",
		"raw_app_meta_data",
		"raw_user_meta_data",
		"created_at",
		"updated_at",
		"last_sign_in_at",
		"is_super_admin",
		"is_sso_user",
		"is_anonymous"
	)
values
	(
		'00000000-0000-0000-0000-000000000000',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18', -- learner-t2 (GarlicTongue)
		'authenticated',
		'authenticated',
		'sunloapp+t2@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '30 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "21f1f69c-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp+t2@gmail.com", "email_verified": true, "phone_verified": false}',
		now() - interval '30 days',
		now() - interval '2 hours',
		now() - interval '2 hours',
		false,
		false,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'27ad846a-d55b-4035-8be2-dbcc70074f74', -- friend-t2 (Lexigrande)
		'authenticated',
		'authenticated',
		'sunloapp+t2-friend@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '3 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		now() - interval '3 days',
		now() - interval '1 hour',
		now() - interval '1 hour',
		false,
		false,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21', -- learner2-t2 (Mejor Amigo)
		'authenticated',
		'authenticated',
		'sunloapp+t2-1@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '5 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		now() - interval '5 days',
		now() - interval '5 days',
		now() - interval '5 days',
		false,
		false,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5', -- learner3-t2 (Office Pierre)
		'authenticated',
		'authenticated',
		'sunloapp+t2-2@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '60 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"email_verified": true}',
		now() - interval '2 days',
		now() - interval '2 days',
		null,
		false,
		false,
		false
	),
	(
		'00000000-0000-0000-0000-000000000000',
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8', -- new-user-t2 (no profile)
		'authenticated',
		'authenticated',
		'sunloapp+t2-new@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '1 hour',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8", "role": "learner", "email": "sunloapp+t2-new@gmail.com", "email_verified": true, "phone_verified": false}',
		now() - interval '1 hour',
		now() - interval '1 hour',
		now() - interval '1 hour',
		false,
		false,
		false
	);

-- Supabase Auth (gotrue) scans these token columns into non-nullable Go
-- strings. The minimal INSERT above leaves them NULL, which crashes login
-- with "converting NULL to string is unsupported". Set them to '' to match
-- the team-1 seed and the shape gotrue expects.
update "auth"."users"
set
	"confirmation_token" = coalesce("confirmation_token", ''),
	"recovery_token" = coalesce("recovery_token", ''),
	"email_change_token_new" = coalesce("email_change_token_new", ''),
	"email_change" = coalesce("email_change", ''),
	"email_change_token_current" = coalesce("email_change_token_current", ''),
	"phone_change" = coalesce("phone_change", ''),
	"phone_change_token" = coalesce("phone_change_token", ''),
	"reauthentication_token" = coalesce("reauthentication_token", '')
where
	"id" in (
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8'
	);

--
-- auth.identities — provider rows that must accompany each auth.user.
--
insert into
	"auth"."identities" (
		"provider_id",
		"user_id",
		"identity_data",
		"provider",
		"last_sign_in_at",
		"created_at",
		"updated_at",
		"id"
	)
values
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'{"sub": "21f1f69c-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp+t2@gmail.com", "email_verified": true, "phone_verified": false}',
		'email',
		now() - interval '30 days',
		now() - interval '30 days',
		now() - interval '30 days',
		'2afbf148-aaf2-4583-80fd-188cfc041222'
	),
	(
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'{"sub": "27ad846a-d55b-4035-8be2-dbcc70074f74", "email": "sunloapp+t2-friend@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '3 days',
		now() - interval '3 days',
		now() - interval '3 days',
		'4404ec5d-b62e-4a76-abb7-51a6a9f79222'
	),
	(
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'{"sub": "22dfa256-ef7b-41b0-b05a-d97afab8dd21", "email": "sunloapp+t2-1@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '2 days',
		now() - interval '2 days',
		now() - interval '2 days',
		'42e47091-e1a1-41a7-8a4f-7147c72e9222'
	),
	(
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'{"sub": "2a32f65e-a496-4afc-abd3-798d8e6d9ec5", "email": "sunloapp+t2-2@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '1 days',
		now() - interval '1 days',
		now() - interval '1 days',
		'c8e68f48-8d91-426e-a1fc-4aefb8d69222'
	),
	(
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8',
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8',
		'{"sub": "2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8", "role": "learner", "email": "sunloapp+t2-new@gmail.com", "email_verified": true, "phone_verified": false}',
		'email',
		now() - interval '1 hour',
		now() - interval '1 hour',
		now() - interval '1 hour',
		'e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a222'
	);

--
-- user_profile — 4 rows; new-user has no profile (drives onboarding).
--
insert into
	"public"."user_profile" (
		"uid",
		"username",
		"updated_at",
		"created_at",
		"avatar_path",
		"languages_known"
	)
values
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'GarlicTongue',
		null,
		now() - interval '30 days',
		null,
		'[{"lang": "eng", "level": "fluent"}]'
	),
	(
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'Lexigrande',
		null,
		now() - interval '3 days',
		null,
		'[{"lang": "eng", "level": "fluent"}]'
	),
	(
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Mejor Amigo',
		null,
		now() - interval '2 days',
		null,
		'[{"lang": "eng", "level": "fluent"}, {"lang": "spa", "level": "fluent"}]'
	),
	(
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'Office Pierre',
		null,
		now() - interval '2 days',
		null,
		'[{"lang": "eng", "level": "fluent"}, {"lang": "fra", "level": "fluent"}, {"lang": "spa", "level": "proficient"}]'
	);

--
-- phrase — ~14 french phrases + 5 spanish phrases. The IDs prefixed `f...`
-- are referenced as team-2 tags; the rest are filler so the deck has cards.
--
insert into
	"public"."phrase" ("text", "id", "added_by", "lang", "only_reverse", "created_at")
values
	-- French (lang_full)
	(
		'Bonjour',
		'fa110001-1111-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '25 days'
	),
	(
		'Bonsoir',
		'fa110002-2222-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '24 days'
	),
	(
		'Comment ça va?',
		'fa110003-3333-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		false,
		current_date - interval '23 days'
	),
	(
		'Merci beaucoup',
		'fa110004-4444-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '22 days'
	),
	(
		'S''il vous plaît',
		'fa110005-5555-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		false,
		current_date - interval '21 days'
	),
	(
		'Au revoir',
		'fa110008-8888-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		false,
		current_date - interval '20 days'
	),
	(
		'Excusez-moi',
		'fa110009-9999-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '19 days'
	),
	(
		'Je ne comprends pas',
		'fa110010-0000-4aaa-bbbb-cccccccccccc',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'fra',
		false,
		current_date - interval '18 days'
	),
	(
		'Où sont les toilettes?',
		'fa110011-1111-4bbb-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '17 days'
	),
	(
		'Je voudrais un café',
		'fa110012-2222-4bbb-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		false,
		current_date - interval '16 days'
	),
	(
		'À demain',
		'fa110013-3333-4bbb-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '15 days'
	),
	(
		'Bonne nuit',
		'fa110014-4444-4bbb-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		false,
		current_date - interval '14 days'
	),
	-- Tagged French phrase shown in the new-playlist phrase picker for full_picker_phrase.
	(
		'Salut tout le monde',
		'f2bae84f-5b1d-43c2-8927-ef4d41c7e794',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		false,
		current_date - interval '13 days'
	),
	-- Spanish (lang_partial)
	-- partial_phrase_with_card: learner has a card for this.
	(
		'Hola amigo',
		'ff110006-6666-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'spa',
		false,
		current_date - interval '20 days'
	),
	-- partial_nocard_phrase: learner has NO card for this.
	(
		'Feliz año nuevo',
		'ff110007-7777-4aaa-bbbb-cccccccccccc',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'spa',
		false,
		current_date - interval '18 days'
	),
	-- partial_attach_phrase: searchable from picker by 'sopa'.
	(
		'Una sopa y un café por favor',
		'f0fbbe1d-705e-4d93-a231-ac55263fcfee',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'spa',
		false,
		current_date - interval '15 days'
	),
	-- partial_picker_phrase: appears in the new-playlist picker for spa.
	(
		'Buenos días',
		'f9e3edac-de8b-4796-b436-a0cded08d2ae',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'spa',
		false,
		current_date - interval '12 days'
	),
	(
		'Gracias',
		'fb110008-8888-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'spa',
		false,
		current_date - interval '10 days'
	);

--
-- phrase_translation — at least one English translation per phrase. The
-- partial_attach_phrase needs 'sopa' searchable so the translation row is
-- included in the trigram index.
--
insert into
	"public"."phrase_translation" ("id", "added_by", "phrase_id", "text", "lang", "created_at")
values
	(
		'fa221001-1111-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110001-1111-4aaa-bbbb-cccccccccccc',
		'Hello',
		'eng',
		current_date - interval '25 days'
	),
	(
		'fa221002-2222-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110002-2222-4aaa-bbbb-cccccccccccc',
		'Good evening',
		'eng',
		current_date - interval '24 days'
	),
	(
		'fa221003-3333-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fa110003-3333-4aaa-bbbb-cccccccccccc',
		'How are you?',
		'eng',
		current_date - interval '23 days'
	),
	(
		'fa221004-4444-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110004-4444-4aaa-bbbb-cccccccccccc',
		'Thank you very much',
		'eng',
		current_date - interval '22 days'
	),
	(
		'fa221005-5555-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fa110005-5555-4aaa-bbbb-cccccccccccc',
		'Please',
		'eng',
		current_date - interval '21 days'
	),
	(
		'fa221008-8888-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fa110008-8888-4aaa-bbbb-cccccccccccc',
		'Goodbye',
		'eng',
		current_date - interval '20 days'
	),
	(
		'fa221009-9999-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110009-9999-4aaa-bbbb-cccccccccccc',
		'Excuse me',
		'eng',
		current_date - interval '19 days'
	),
	(
		'fa221010-0000-4aaa-bbbb-cccccccccccc',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'fa110010-0000-4aaa-bbbb-cccccccccccc',
		'I do not understand',
		'eng',
		current_date - interval '18 days'
	),
	(
		'fa221011-1111-4bbb-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110011-1111-4bbb-bbbb-cccccccccccc',
		'Where are the toilets?',
		'eng',
		current_date - interval '17 days'
	),
	(
		'fa221012-2222-4bbb-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fa110012-2222-4bbb-bbbb-cccccccccccc',
		'I would like a coffee',
		'eng',
		current_date - interval '16 days'
	),
	(
		'fa221013-3333-4bbb-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110013-3333-4bbb-bbbb-cccccccccccc',
		'See you tomorrow',
		'eng',
		current_date - interval '15 days'
	),
	(
		'fa221014-4444-4bbb-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fa110014-4444-4bbb-bbbb-cccccccccccc',
		'Good night',
		'eng',
		current_date - interval '14 days'
	),
	(
		'fa222001-1111-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'f2bae84f-5b1d-43c2-8927-ef4d41c7e794',
		'Hello everyone',
		'eng',
		current_date - interval '13 days'
	),
	(
		'fb221006-6666-4aaa-bbbb-cccccccccccc',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'ff110006-6666-4aaa-bbbb-cccccccccccc',
		'Hello friend',
		'eng',
		current_date - interval '20 days'
	),
	(
		'fb221007-7777-4aaa-bbbb-cccccccccccc',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'ff110007-7777-4aaa-bbbb-cccccccccccc',
		'Happy new year',
		'eng',
		current_date - interval '18 days'
	),
	(
		'fb22fbe1-705e-4d93-a231-ac55263fcfee',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'f0fbbe1d-705e-4d93-a231-ac55263fcfee',
		'Soup and a coffee please',
		'eng',
		current_date - interval '15 days'
	),
	(
		'fb22e3da-de8b-4796-b436-a0cded08d2ae',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'f9e3edac-de8b-4796-b436-a0cded08d2ae',
		'Good morning',
		'eng',
		current_date - interval '12 days'
	),
	(
		'fb221008-8888-4aaa-bbbb-cccccccccccc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fb110008-8888-4aaa-bbbb-cccccccccccc',
		'Thank you',
		'eng',
		current_date - interval '10 days'
	);

--
-- phrase_request — five tagged requests, mirroring the team-1 set.
--
insert into
	"public"."phrase_request" (
		"id",
		"created_at",
		"requester_uid",
		"lang",
		"prompt",
		"upvote_count"
	)
values
	-- full_shared_chat_request: learner2 asks in fra; shared in chat with learner.
	(
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986',
		now() - interval '3 days',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		'How do I order a sandwich in French?',
		0
	),
	-- partial_crud_request: learner asks in spa.
	(
		'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		now() - interval '2 days',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'spa',
		'¿Cómo pido una sopa y un café?',
		0
	),
	-- full_request_for_comments: learner asks in fra.
	(
		'f3f8c9e2-1234-4567-89ab-cdef01234567',
		current_date - interval '8 days',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		'I''m learning French cooking and need market phrases — how do I ask for tomatoes, onions, garlic, and herbs?',
		2
	),
	-- partial_request_for_upvote: learner2 asks in spa.
	(
		'f4a9d0f3-2345-5678-90bc-def012345678',
		current_date - interval '6 days',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'spa',
		'¿Cómo pregunto dónde está el baño? También necesito "perdón" y "gracias".',
		1
	),
	-- partial_request_for_answers: learner asks in spa.
	(
		'f6c1f2a5-4567-4890-a2de-f01234567890',
		current_date - interval '1 day',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'spa',
		'Necesito ayuda con direcciones en español: izquierda, derecha, recto, doblar, parar.',
		0
	);

--
-- phrase_playlist — two tagged playlists.
--
insert into
	"public"."phrase_playlist" (
		"id",
		"uid",
		"title",
		"description",
		"created_at",
		"lang",
		"upvote_count"
	)
values
	-- full_playlist_for_edits
	(
		'f1b2c3d4-1111-4222-a333-444444444444',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'Essential French Greetings',
		'Common greetings and polite phrases for everyday French conversations',
		current_date - interval '15 days',
		'fra',
		12
	),
	-- partial_featured_playlist
	(
		'f3d4e5f6-3333-4444-a555-666666666666',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'Basic Spanish Phrases',
		'Starter phrases for Spanish learners',
		current_date - interval '10 days',
		'spa',
		5
	);

--
-- playlist_phrase_link — at least one phrase per tagged playlist so the
-- detail page renders something.
--
insert into
	"public"."playlist_phrase_link" ("id", "uid", "phrase_id", "playlist_id", "order", "created_at")
values
	(
		'f1111111-aaaa-4bbb-8ccc-dddddddddddd',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110001-1111-4aaa-bbbb-cccccccccccc',
		'f1b2c3d4-1111-4222-a333-444444444444',
		1.0,
		current_date - interval '15 days'
	),
	(
		'f2222222-bbbb-4ccc-8ddd-eeeeeeeeeeee',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fa110004-4444-4aaa-bbbb-cccccccccccc',
		'f1b2c3d4-1111-4222-a333-444444444444',
		2.0,
		current_date - interval '15 days'
	),
	(
		'f3333333-cccc-4ddd-8eee-ffffffffffff',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'f9e3edac-de8b-4796-b436-a0cded08d2ae',
		'f3d4e5f6-3333-4444-a555-666666666666',
		1.0,
		current_date - interval '10 days'
	),
	(
		'f4444444-dddd-4eee-8fff-000000000000',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'f0fbbe1d-705e-4d93-a231-ac55263fcfee',
		'f3d4e5f6-3333-4444-a555-666666666666',
		2.0,
		current_date - interval '10 days'
	);

--
-- request_comment — mirrors the team-1 set in seed.sql + seed-comments.sql.
-- partial_phrase_linked_seed_comment must keep upvote_count > all siblings on
-- partial_crud_request so it sorts first; comment-crud.spec.md asserts on
-- `comment-phrase-link-badge #2`.
--
insert into
	"public"."request_comment" (
		"id",
		"request_id",
		"parent_comment_id",
		"uid",
		"content",
		"created_at",
		"upvote_count"
	)
values
	-- friend on full_shared_chat_request (mirrors c0000001).
	(
		'f0000001-1111-4222-8333-444444444444',
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986',
		null,
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'Tu peux dire « Je voudrais un sandwich » — c''est la phrase classique',
		current_date - interval '3 days' + interval '2 hours',
		5
	),
	-- learner2 reply on c0000001 thread (mirrors c0000002).
	(
		'f0000002-2222-4333-8444-555555555555',
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986',
		'f0000001-1111-4222-8333-444444444444',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Merci beaucoup, c''est exactement ce qu''il me fallait!',
		current_date - interval '3 days' + interval '4 hours',
		2
	),
	-- partial_crud_reply_target_comment (mirrors c0000003): learner2 on partial_crud_request.
	(
		'f0000003-3333-4444-8555-666666666666',
		'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		null,
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Para sopa y café: "Una sopa y un café por favor" — ya lo añadí a mi colección',
		current_date - interval '2 days' + interval '1 hour',
		3
	),
	-- partial_learner_seed_comment (mirrors c0000004): learner on partial_crud_request.
	-- Preserved by comment-crud.spec.md cleanup; partial_learner_seed_comment_text must match.
	(
		'f0000004-4444-4555-8666-777777777777',
		'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		null,
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'También puedes pedir un té',
		current_date - interval '2 days' + interval '3 hours',
		1
	),
	-- full_seed_comment (mirrors c0000005): learner2 on full_request_for_comments.
	(
		'f0000005-5555-4666-8777-888888888888',
		'f3f8c9e2-1234-4567-89ab-cdef01234567',
		null,
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Belle question! Au marché tu peux montrer du doigt et dire « ça coûte combien? » ou « avez-vous des [item]? »',
		current_date - interval '7 days' + interval '5 hours',
		4
	),
	-- friend on partial_request_for_upvote (mirrors c0000006).
	(
		'f0000006-6666-7777-8888-999999999999',
		'f4a9d0f3-2345-5678-90bc-def012345678',
		null,
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'En España la gente normalmente pregunta por "el aseo" en vez de "el baño"',
		current_date - interval '6 days' + interval '2 hours',
		2
	),
	-- partial_phrase_linked_seed_comment (mirrors 800d41d1): learner2 on partial_crud_request,
	-- with phrase link AND highest upvote_count on the request so it sorts first.
	-- Don't lower this count below 4 — comment-crud asserts `#2` on friend's badge.
	(
		'f00d41d1-3161-4a22-9d6f-dd0dcb29374a',
		'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		null,
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Solo di "dame uno" así',
		now() - interval '23 hours',
		5
	);

--
-- comment_phrase_link — partial_phrase_linked_seed_comment must have a phrase
-- link attached so the badge renders.
--
insert into
	"public"."comment_phrase_link" (
		"id",
		"request_id",
		"comment_id",
		"phrase_id",
		"uid",
		"created_at"
	)
values
	(
		'faaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986',
		'f0000001-1111-4222-8333-444444444444',
		'fa110009-9999-4aaa-bbbb-cccccccccccc',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		current_date - interval '3 days' + interval '2 hours'
	),
	(
		'fd14296c-da0c-4463-a547-fa6538d1341a',
		'f40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96',
		'f00d41d1-3161-4a22-9d6f-dd0dcb29374a',
		'f0fbbe1d-705e-4d93-a231-ac55263fcfee',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '23 hours'
	);

--
-- chat_message — friend↔learner thread (so feed.spec.md "Sent a phrase
-- recommendation." assertion passes) and learner2→learner share of
-- full_shared_chat_request (drives phrase-from-chat-request.spec.md).
--
insert into
	"public"."chat_message" (
		"id",
		"created_at",
		"sender_uid",
		"recipient_uid",
		"message_type",
		"phrase_id",
		"related_message_id",
		"content",
		"lang",
		"request_id"
	)
values
	-- learner sends friend a phrase recommendation in fra.
	(
		'f9d88502-9769-4e2d-86d1-ed948588fbbb',
		now() - interval '48 hours',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'recommendation',
		'fa110001-1111-4aaa-bbbb-cccccccccccc',
		null,
		null,
		'fra',
		null
	),
	-- learner shares partial_request_for_answers with friend.
	(
		'f6cdc91b-a7e6-4e7d-9769-868f16ae7361',
		now() - interval '47 hours',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'request',
		null,
		null,
		null,
		'spa',
		'f6c1f2a5-4567-4890-a2de-f01234567890'
	),
	-- learner sends learner2 a phrase recommendation.
	(
		'f628f6f8-02d8-4f34-aeea-34b762bb6911',
		now() - interval '46 hours',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'recommendation',
		'fa110004-4444-4aaa-bbbb-cccccccccccc',
		null,
		null,
		'fra',
		null
	),
	-- learner2 shares full_shared_chat_request with friend.
	(
		'fad6409d-0853-43ba-925d-daaa754de1b4',
		now() - interval '45 hours',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'request',
		null,
		null,
		null,
		'fra',
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986'
	),
	-- learner2 shares full_shared_chat_request with learner (the message
	-- phrase-from-chat-request.spec.md taps).
	(
		'f208016d-b27b-4c20-a4ed-ca6e9e9972e6',
		now() - interval '44 hours',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'request',
		null,
		null,
		null,
		'fra',
		'f0d3a74e-4fe7-43c0-aa35-d05c83929986'
	);

--
-- friend_request_action — establish friendships:
--   learner ↔ friend, learner ↔ learner2, friend ↔ learner2, learner ↔ learner3.
--
insert into
	"public"."friend_request_action" (
		"id",
		"uid_by",
		"uid_for",
		"created_at",
		"action_type",
		"uid_less",
		"uid_more"
	)
values
	(
		'fb4ff785-00c6-4d8e-8dc5-0053b1e23ef7',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '60 days',
		'invite',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74'
	),
	(
		'f37e5105-991e-4559-b237-930c5e969b31',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		now() - interval '59 days',
		'accept',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74'
	),
	(
		'fe9902b8-54b6-4372-b6f6-fe25d499bd72',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		now() - interval '58 days',
		'invite',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'27ad846a-d55b-4035-8be2-dbcc70074f74'
	),
	(
		'f7fcadd9-7f75-48eb-b288-320c9ec9d33e',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '56 days',
		'accept',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'27ad846a-d55b-4035-8be2-dbcc70074f74'
	),
	(
		'fc944af5-942e-4522-a000-b2cf19927026',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '57 days',
		'invite',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21'
	),
	(
		'f104f367-058c-4e50-bfd1-e35827dda31b',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		now() - interval '55 days',
		'accept',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21'
	),
	(
		'f4a29d11-29f9-475f-a539-071bcc79f7ff',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		now() - interval '54 days',
		'invite',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5'
	),
	(
		'f9335fd1-7943-4989-9058-e69671559bf1',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		now() - interval '53 days',
		'accept',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5'
	);

--
-- user_deck — learner has fra (full) and spa (partial); does NOT have eus.
-- Other actors get fra so they have something to interact with.
--
insert into
	"public"."user_deck" (
		"id",
		"uid",
		"lang",
		"created_at",
		"learning_goal",
		"archived",
		"daily_review_goal"
	)
values
	(
		'fdfa6cb0-5f8a-43d8-bc9f-5a9f474719c4',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fra',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'fe0b23bb-fe8c-4dfb-bdd6-65b2c60644f0',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'spa',
		now() - interval '15 days',
		'moving',
		false,
		15
	),
	(
		'f8b73b2e-8e32-4f9e-8044-67486e5e0399',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'fra',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'f05000e6-9b26-4632-b971-0df96a35c2bc',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'spa',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'f7df4722-4003-43ad-99ba-0e9de75ace0b',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'fra',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'fc7053b1-4f34-4153-ad5a-9278d452949c',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'fra',
		now() - interval '30 days',
		'moving',
		false,
		15
	),
	(
		'fe9259fb-a94f-48f9-b8e6-5edfefc9c878',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'spa',
		now() - interval '15 days',
		'moving',
		false,
		15
	);

--
-- user_card — give learner cards in fra (≥ 15 for review goal) and at least
-- one spa card for partial_phrase_with_card. Other actors don't need cards.
--
insert into
	"public"."user_card" (
		"uid",
		"id",
		"phrase_id",
		"created_at",
		"updated_at",
		"status",
		"lang",
		"direction"
	)
values
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110001-1111-4aaa-bbbb-222222222222',
		'fa110001-1111-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110002-2222-4aaa-bbbb-222222222222',
		'fa110002-2222-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110003-3333-4aaa-bbbb-222222222222',
		'fa110003-3333-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110004-4444-4aaa-bbbb-222222222222',
		'fa110004-4444-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110005-5555-4aaa-bbbb-222222222222',
		'fa110005-5555-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110008-8888-4aaa-bbbb-222222222222',
		'fa110008-8888-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110009-9999-4aaa-bbbb-222222222222',
		'fa110009-9999-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110010-0000-4aaa-bbbb-222222222222',
		'fa110010-0000-4aaa-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110011-1111-4bbb-bbbb-222222222222',
		'fa110011-1111-4bbb-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110012-2222-4bbb-bbbb-222222222222',
		'fa110012-2222-4bbb-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110013-3333-4bbb-bbbb-222222222222',
		'fa110013-3333-4bbb-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110014-4444-4bbb-bbbb-222222222222',
		'fa110014-4444-4bbb-bbbb-cccccccccccc',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc110015-1111-4ccc-bbbb-222222222222',
		'f2bae84f-5b1d-43c2-8927-ef4d41c7e794',
		current_date - interval '20 days',
		current_date - interval '20 days',
		'active',
		'fra',
		'forward'
	),
	-- partial_phrase_with_card: learner has a card for this spa phrase.
	(
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'fc220006-6666-4aaa-bbbb-222222222222',
		'ff110006-6666-4aaa-bbbb-cccccccccccc',
		current_date - interval '12 days',
		current_date - interval '12 days',
		'active',
		'spa',
		'forward'
	);
