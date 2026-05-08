-- Auth users and identities for all 10 test actors (team1 + team2).
--
-- This file is static — auth.users is not a public table and cannot be
-- dumped by dump-new-seeds.ts. Update it here if actors change.
--
-- Team 1 actors (HIN/KAN/SPA):
--   learner   cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18  sunloapp@gmail.com
--   friend    7ad846a9-d55b-4035-8be2-dbcc70074f74  sunloapp+friend@gmail.com
--   learner2  a2dfa256-ef7b-41b0-b05a-d97afab8dd21  sunloapp+1@gmail.com
--   learner3  a32f65e7-a496-4afc-abd3-798d8e6d9ec5  sunloapp+2@gmail.com
--   new-user  d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8  sunloapp+new@gmail.com
--
-- Team 2 actors (FRA/SPA/EUS):
--   learner   21f1f69c-10fa-4059-8fd4-3c6dcef9ba18  sunloapp+t2@gmail.com
--   friend    27ad846a-d55b-4035-8be2-dbcc70074f74  sunloapp+t2-friend@gmail.com
--   learner2  22dfa256-ef7b-41b0-b05a-d97afab8dd21  sunloapp+t2-1@gmail.com
--   learner3  2a32f65e-a496-4afc-abd3-798d8e6d9ec5  sunloapp+t2-2@gmail.com
--   new-user  2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8  sunloapp+t2-new@gmail.com
--
-- All passwords are bcrypt of "password".
-- ON CONFLICT DO NOTHING makes this safe to run via db-reseed (which does
-- not truncate auth tables).
set
	session_replication_role = replica;

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
	-- team1: learner
	(
		'00000000-0000-0000-0000-000000000000',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'authenticated',
		'authenticated',
		'sunloapp@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '30 days',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}',
		now() - interval '30 days',
		now() - interval '2 hours',
		now() - interval '2 hours',
		false,
		false,
		false
	),
	-- team1: friend
	(
		'00000000-0000-0000-0000-000000000000',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'authenticated',
		'authenticated',
		'sunloapp+friend@gmail.com',
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
	-- team1: learner2
	(
		'00000000-0000-0000-0000-000000000000',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'authenticated',
		'authenticated',
		'sunloapp+1@gmail.com',
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
	-- team1: learner3
	(
		'00000000-0000-0000-0000-000000000000',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'authenticated',
		'authenticated',
		'sunloapp+2@gmail.com',
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
	-- team1: new-user (no profile, drives onboarding flow)
	(
		'00000000-0000-0000-0000-000000000000',
		'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		'authenticated',
		'authenticated',
		'sunloapp+new@gmail.com',
		'$2a$10$nbkbcyoLi.buagd2DyyT0u4kpYoV.VZh6fSqRWvNxmZkea0XUcybG',
		now() - interval '1 hour',
		'{"provider": "email", "providers": ["email"]}',
		'{"sub": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8", "role": "learner", "email": "sunloapp+new@gmail.com", "email_verified": true, "phone_verified": false}',
		now() - interval '1 hour',
		now() - interval '1 hour',
		now() - interval '1 hour',
		false,
		false,
		false
	),
	-- team2: learner
	(
		'00000000-0000-0000-0000-000000000000',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
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
	-- team2: friend
	(
		'00000000-0000-0000-0000-000000000000',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
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
	-- team2: learner2
	(
		'00000000-0000-0000-0000-000000000000',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
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
	-- team2: learner3
	(
		'00000000-0000-0000-0000-000000000000',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
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
	-- team2: new-user (no profile, drives onboarding flow)
	(
		'00000000-0000-0000-0000-000000000000',
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8',
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
	)
on conflict (id) do nothing;

-- Gotrue scans token columns into non-nullable Go strings.
-- NULL crashes login; set them to '' for any rows we just inserted.
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
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		'21f1f69c-10fa-4059-8fd4-3c6dcef9ba18',
		'27ad846a-d55b-4035-8be2-dbcc70074f74',
		'22dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'2a32f65e-a496-4afc-abd3-798d8e6d9ec5',
		'2e4e5f6a-7b8c-4d0e-a1f2-b3c4d5e6f7a8'
	);

insert into
	"auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id")
values
	-- team1
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'{"sub": "cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18", "role": "learner", "email": "sunloapp@gmail.com", "email_verified": true, "phone_verified": false}',
		'email',
		now() - interval '30 days',
		now() - interval '30 days',
		now() - interval '30 days',
		'2afbf148-aaf2-4583-80fd-188cfc0410f3'
	),
	(
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'{"sub": "7ad846a9-d55b-4035-8be2-dbcc70074f74", "email": "sunloapp+friend@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '3 days',
		now() - interval '3 days',
		now() - interval '3 days',
		'4404ec5d-b62e-4a76-abb7-51a6a9f79695'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'{"sub": "a2dfa256-ef7b-41b0-b05a-d97afab8dd21", "email": "sunloapp+1@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '2 days',
		now() - interval '2 days',
		now() - interval '2 days',
		'42e47091-e1a1-41a7-8a4f-7147c72e9fa5'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'{"sub": "a32f65e7-a496-4afc-abd3-798d8e6d9ec5", "email": "sunloapp+2@gmail.com", "email_verified": false, "phone_verified": false}',
		'email',
		now() - interval '1 days',
		now() - interval '1 days',
		now() - interval '1 days',
		'c8e68f48-8d91-426e-a1fc-4aefb8d690d3'
	),
	(
		'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		'd4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8',
		'{"sub": "d4e5f6a7-b8c9-4d0e-a1f2-b3c4d5e6f7a8", "role": "learner", "email": "sunloapp+new@gmail.com", "email_verified": true, "phone_verified": false}',
		'email',
		now() - interval '1 hour',
		now() - interval '1 hour',
		now() - interval '1 hour',
		'e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a8b9'
	),
	-- team2
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
	)
on conflict (id) do nothing;

reset all;
