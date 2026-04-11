-- v0.18 extra seed data: more HIN/KAN playlists, comments with replies, review histories
-- Users reference:
--   cf1f69ce = GarlicFace (sunloapp@gmail.com) - main test user
--   7ad846a9 = Lexigrine (sunloapp+friend@gmail.com)
--   a2dfa256 = Best Frin (sunloapp+1@gmail.com)
--   a32f65e7 = Work Andy (sunloapp+2@gmail.com) - speaks tam/hin/kan fluently
----------------------------------------------------------------------
-- 1. NEW KANNADA PHRASES (expand the small kan corpus)
----------------------------------------------------------------------
insert into
	"public"."phrase" ("text", "id", "added_by", "lang", "created_at", "text_script")
values
	(
		'Nimage hEgidE?',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'kan',
		current_date - interval '25 days',
		null
	),
	(
		'Dhanyavadagalu',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'kan',
		current_date - interval '25 days',
		null
	),
	(
		'Nanu Kannada kaliyuttiddene',
		'aa110003-3333-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'kan',
		current_date - interval '24 days',
		null
	),
	(
		'Idhu eshtu?',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'kan',
		current_date - interval '24 days',
		null
	),
	(
		'Shauchalaya elli?',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'kan',
		current_date - interval '20 days',
		null
	),
	(
		'Nanu swalpa Kannada matadtini',
		'aa110006-6666-4aaa-bbbb-cccccccccccc',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'kan',
		current_date - interval '20 days',
		null
	),
	-- aa110007: learner has NO card for this phrase; used as [team.nocard_phrase] in scenetest
	(
		'Hosa varsha shubhashayagalu',
		'aa110007-7777-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'kan',
		current_date - interval '18 days',
		null
	),
	(
		'Oota aayitha?',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'kan',
		current_date - interval '15 days',
		null
	);

----------------------------------------------------------------------
-- 1b. TRANSLATIONS for new Kannada phrases
----------------------------------------------------------------------
insert into
	"public"."phrase_translation" (
		"text",
		"literal",
		"id",
		"phrase_id",
		"added_by",
		"lang",
		"text_script",
		"created_at"
	)
values
	(
		'How are you?',
		'To-you how-is?',
		'bb110001-1111-4bbb-aaaa-cccccccccccc',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'eng',
		null,
		current_date - interval '25 days'
	),
	(
		'Thank you',
		null,
		'bb110002-2222-4bbb-aaaa-cccccccccccc',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'eng',
		null,
		current_date - interval '25 days'
	),
	(
		'I am learning Kannada',
		'I Kannada learning-am',
		'bb110003-3333-4bbb-aaaa-cccccccccccc',
		'aa110003-3333-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'eng',
		null,
		current_date - interval '24 days'
	),
	(
		'How much is this?',
		'This how-much?',
		'bb110004-4444-4bbb-aaaa-cccccccccccc',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'eng',
		null,
		current_date - interval '24 days'
	),
	(
		'Where is the bathroom?',
		'Bathroom where?',
		'bb110005-5555-4bbb-aaaa-cccccccccccc',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'eng',
		null,
		current_date - interval '20 days'
	),
	(
		'I speak a little Kannada',
		'I little Kannada speak',
		'bb110006-6666-4bbb-aaaa-cccccccccccc',
		'aa110006-6666-4aaa-bbbb-cccccccccccc',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'eng',
		null,
		current_date - interval '20 days'
	),
	(
		'Happy New Year!',
		'New year good-wishes',
		'bb110007-7777-4bbb-aaaa-cccccccccccc',
		'aa110007-7777-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'eng',
		null,
		current_date - interval '18 days'
	),
	(
		'Have you eaten?',
		'Food happened?',
		'bb110008-8888-4bbb-aaaa-cccccccccccc',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'eng',
		null,
		current_date - interval '15 days'
	);

----------------------------------------------------------------------
-- 2. NEW PLAYLISTS (HIN + KAN, multiple users)
----------------------------------------------------------------------
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
	(
		'aa220001-1111-4aaa-bbbb-dddddddddddd',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'Kannada Survival Kit',
		'The bare minimum phrases you need to get by in Karnataka',
		current_date - interval '14 days',
		'kan',
		7
	),
	(
		'aa220002-2222-4aaa-bbbb-dddddddddddd',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'Hindi Expressions & Feelings',
		'Common ways to express emotions and reactions in Hindi',
		current_date - interval '11 days',
		'hin',
		4
	),
	(
		'aa220003-3333-4aaa-bbbb-dddddddddddd',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'Kannada at the Market',
		'Phrases for shopping, bargaining, and buying groceries in Kannada',
		current_date - interval '9 days',
		'kan',
		11
	),
	(
		'aa220004-4444-4aaa-bbbb-dddddddddddd',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'Hindi Daily Conversations',
		'Everyday small-talk phrases that come up constantly',
		current_date - interval '6 days',
		'hin',
		3
	);

----------------------------------------------------------------------
-- 2b. PLAYLIST PHRASE LINKS
----------------------------------------------------------------------
insert into
	"public"."playlist_phrase_link" ("id", "uid", "phrase_id", "playlist_id", "order", "created_at")
values
	-- Kannada Survival Kit (Work Andy)
	(
		'aa230001-1111-4aaa-bbbb-eeeeeeeeeeee',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		'aa220001-1111-4aaa-bbbb-dddddddddddd',
		1.0,
		current_date - interval '14 days'
	),
	(
		'aa230002-2222-4aaa-bbbb-eeeeeeeeeeee',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'aa220001-1111-4aaa-bbbb-dddddddddddd',
		2.0,
		current_date - interval '14 days'
	),
	(
		'aa230003-3333-4aaa-bbbb-eeeeeeeeeeee',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		'aa220001-1111-4aaa-bbbb-dddddddddddd',
		3.0,
		current_date - interval '14 days'
	),
	(
		'aa230004-4444-4aaa-bbbb-eeeeeeeeeeee',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		'aa220001-1111-4aaa-bbbb-dddddddddddd',
		4.0,
		current_date - interval '14 days'
	),
	-- Hindi Expressions (GarlicFace)
	(
		'aa230005-5555-4aaa-bbbb-eeeeeeeeeeee',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		'aa220002-2222-4aaa-bbbb-dddddddddddd',
		1.0,
		current_date - interval '11 days'
	),
	(
		'aa230006-6666-4aaa-bbbb-eeeeeeeeeeee',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		'aa220002-2222-4aaa-bbbb-dddddddddddd',
		2.0,
		current_date - interval '11 days'
	),
	(
		'aa230007-7777-4aaa-bbbb-eeeeeeeeeeee',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'bf1cee96-86f2-44e9-97e3-59897dd864ed',
		'aa220002-2222-4aaa-bbbb-dddddddddddd',
		3.0,
		current_date - interval '11 days'
	),
	-- Kannada at the Market (Best Frin)
	(
		'aa230008-8888-4aaa-bbbb-eeeeeeeeeeee',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		'aa220003-3333-4aaa-bbbb-dddddddddddd',
		1.0,
		current_date - interval '9 days'
	),
	(
		'aa230009-9999-4aaa-bbbb-eeeeeeeeeeee',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		'aa220003-3333-4aaa-bbbb-dddddddddddd',
		2.0,
		current_date - interval '9 days'
	),
	(
		'aa23000a-aaaa-4aaa-bbbb-eeeeeeeeeeee',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'b0fbbe1d-705e-4d93-a231-ac55263fcfee',
		'aa220003-3333-4aaa-bbbb-dddddddddddd',
		3.0,
		current_date - interval '9 days'
	),
	-- Hindi Daily Conversations (Lexigrine)
	(
		'aa23000b-bbbb-4aaa-bbbb-eeeeeeeeeeee',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		'aa220004-4444-4aaa-bbbb-dddddddddddd',
		1.0,
		current_date - interval '6 days'
	),
	(
		'aa23000c-cccc-4aaa-bbbb-eeeeeeeeeeee',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'48fe0624-f586-4812-a1a5-33c634995671',
		'aa220004-4444-4aaa-bbbb-dddddddddddd',
		2.0,
		current_date - interval '6 days'
	),
	(
		'aa23000d-dddd-4aaa-bbbb-eeeeeeeeeeee',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		'aa220004-4444-4aaa-bbbb-dddddddddddd',
		3.0,
		current_date - interval '6 days'
	);

----------------------------------------------------------------------
-- 3. MORE COMMENTS WITH REPLIES on HIN and KAN requests
----------------------------------------------------------------------
insert into
	"public"."request_comment" (
		"id",
		"request_id",
		"parent_comment_id",
		"uid",
		"content",
		"created_at",
		"updated_at",
		"upvote_count"
	)
values
	-- Thread on Hindi market request (3f8c9e2a) -- already has one comment from Best Frin
	(
		'aa330001-1111-4aaa-bbbb-ffffffffffff',
		'3f8c9e2a-1234-4567-89ab-cdef01234567',
		'c0000005-5555-4666-8777-888888888888',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'Awesome, thanks! What about for ginger specifically?',
		current_date - interval '7 days' + interval '8 hours',
		current_date - interval '7 days' + interval '8 hours',
		1
	),
	(
		'aa330002-2222-4aaa-bbbb-ffffffffffff',
		'3f8c9e2a-1234-4567-89ab-cdef01234567',
		'c0000005-5555-4666-8777-888888888888',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'For ginger you say "adrak" - "adrak hai?" or "adrak kitne ka hai?"',
		current_date - interval '7 days' + interval '10 hours',
		current_date - interval '7 days' + interval '10 hours',
		3
	),
	(
		'aa330003-3333-4aaa-bbbb-ffffffffffff',
		'3f8c9e2a-1234-4567-89ab-cdef01234567',
		null,
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		'Also useful: "thoda kam karo" (reduce the price a bit) for bargaining!',
		current_date - interval '6 days' + interval '1 hour',
		current_date - interval '6 days' + interval '1 hour',
		5
	),
	-- Thread on Kannada bathroom request (4a9d0f3b)
	(
		'aa330004-4444-4aaa-bbbb-ffffffffffff',
		'4a9d0f3b-2345-5678-90bc-def012345678',
		'c0000006-6666-7777-8888-999999999999',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'True! In Kannada say "Shauchalaya elli?" or more casually "toilet elli?"',
		current_date - interval '6 days' + interval '4 hours',
		current_date - interval '6 days' + interval '4 hours',
		4
	),
	(
		'aa330005-5555-4aaa-bbbb-ffffffffffff',
		'4a9d0f3b-2345-5678-90bc-def012345678',
		'c0000006-6666-7777-8888-999999999999',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'For "excuse me" use "Kshamisi" and "thank you" is "Dhanyavadagalu"',
		current_date - interval '6 days' + interval '6 hours',
		current_date - interval '6 days' + interval '6 hours',
		2
	),
	(
		'aa330006-6666-4aaa-bbbb-ffffffffffff',
		'4a9d0f3b-2345-5678-90bc-def012345678',
		null,
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'I just added these phrases! Check the "Kannada Survival Kit" playlist too.',
		current_date - interval '5 days' + interval '2 hours',
		current_date - interval '5 days' + interval '2 hours',
		1
	),
	-- New thread on Kannada directions request (6c1f2a5d)
	(
		'aa330007-7777-4aaa-bbbb-ffffffffffff',
		'6c1f2a5d-4567-4890-a2de-f01234567890',
		null,
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'Left = "edaku", right = "balaku", straight = "nere", stop = "nillu". Turn is "thirugu".',
		current_date - interval '1 day' + interval '5 hours',
		current_date - interval '1 day' + interval '5 hours',
		2
	),
	(
		'aa330008-8888-4aaa-bbbb-ffffffffffff',
		'6c1f2a5d-4567-4890-a2de-f01234567890',
		'aa330007-7777-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'Perfect, exactly what I needed! Could you add these as phrases?',
		current_date - interval '1 day' + interval '7 hours',
		current_date - interval '1 day' + interval '7 hours',
		0
	),
	(
		'aa330009-9999-4aaa-bbbb-ffffffffffff',
		'6c1f2a5d-4567-4890-a2de-f01234567890',
		'aa330007-7777-4aaa-bbbb-ffffffffffff',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'Done! Added them all with translations.',
		current_date - interval '1 day' + interval '9 hours',
		current_date - interval '1 day' + interval '9 hours',
		1
	),
	-- More on Hindi declining food (5b0e1a4c) -- already has 2 comments
	(
		'aa33000a-aaaa-4aaa-bbbb-ffffffffffff',
		'5b0e1a4c-3456-4789-a1cd-ef0123456789',
		'c0000007-7777-8888-9999-000000000000',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'You can also say "pet bhar gaya" (my stomach is full) - very common and friendly!',
		current_date - interval '3 days' + interval '2 hours',
		current_date - interval '3 days' + interval '2 hours',
		3
	);

----------------------------------------------------------------------
-- 3b. COMMENT PHRASE LINKS (phrases attached to comments as answers)
----------------------------------------------------------------------
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
	-- Work Andy linked Kannada phrases to bathroom request answers
	(
		'aa340001-1111-4aaa-bbbb-111111111111',
		'4a9d0f3b-2345-5678-90bc-def012345678',
		'aa330004-4444-4aaa-bbbb-ffffffffffff',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		current_date - interval '6 days' + interval '4 hours'
	),
	-- Best Frin linked thank you phrase
	(
		'aa340002-2222-4aaa-bbbb-111111111111',
		'4a9d0f3b-2345-5678-90bc-def012345678',
		'aa330005-5555-4aaa-bbbb-ffffffffffff',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		current_date - interval '6 days' + interval '6 hours'
	);

----------------------------------------------------------------------
-- 3c. COMMENT UPVOTES
----------------------------------------------------------------------
insert into
	"public"."comment_upvote" ("comment_id", "uid", "created_at")
values
	(
		'aa330002-2222-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		current_date - interval '7 days' + interval '11 hours'
	),
	(
		'aa330002-2222-4aaa-bbbb-ffffffffffff',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		current_date - interval '7 days' + interval '12 hours'
	),
	(
		'aa330003-3333-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		current_date - interval '6 days' + interval '2 hours'
	),
	(
		'aa330003-3333-4aaa-bbbb-ffffffffffff',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		current_date - interval '6 days' + interval '3 hours'
	),
	(
		'aa330004-4444-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		current_date - interval '6 days' + interval '5 hours'
	),
	(
		'aa330004-4444-4aaa-bbbb-ffffffffffff',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		current_date - interval '6 days' + interval '5 hours'
	),
	(
		'aa330007-7777-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		current_date - interval '1 day' + interval '6 hours'
	),
	(
		'aa33000a-aaaa-4aaa-bbbb-ffffffffffff',
		'7ad846a9-d55b-4035-8be2-dbcc70074f74',
		current_date - interval '3 days' + interval '4 hours'
	),
	(
		'aa33000a-aaaa-4aaa-bbbb-ffffffffffff',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		current_date - interval '3 days' + interval '5 hours'
	);

----------------------------------------------------------------------
-- 4. USER CARDS for new Kannada phrases and Hindi review phrases
----------------------------------------------------------------------
insert into
	"public"."user_card" (
		"uid",
		"id",
		"phrase_id",
		"updated_at",
		"created_at",
		"status",
		"lang",
		"direction"
	)
values
	-- GarlicFace's Hindi cards (needed for review history)
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440101-0001-4aaa-bbbb-222222222222',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		current_date - interval '5 days',
		current_date - interval '5 days',
		'active',
		'hin',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440101-0002-4aaa-bbbb-222222222222',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		current_date - interval '5 days',
		current_date - interval '5 days',
		'active',
		'hin',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440101-0003-4aaa-bbbb-222222222222',
		'48edc28c-1530-4549-b48c-f678033a6892',
		current_date - interval '3 days',
		current_date - interval '3 days',
		'active',
		'hin',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440101-0004-4aaa-bbbb-222222222222',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		current_date - interval '3 days',
		current_date - interval '3 days',
		'active',
		'hin',
		'forward'
	),
	-- Work Andy's Hindi cards (needed for review history)
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa440101-0005-4aaa-bbbb-222222222222',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		current_date - interval '3 days',
		current_date - interval '3 days',
		'active',
		'hin',
		'forward'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa440101-0006-4aaa-bbbb-222222222222',
		'48fe0624-f586-4812-a1a5-33c634995671',
		current_date - interval '3 days',
		current_date - interval '3 days',
		'active',
		'hin',
		'forward'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa440101-0007-4aaa-bbbb-222222222222',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		current_date - interval '3 days',
		current_date - interval '3 days',
		'active',
		'hin',
		'forward'
	),
	-- GarlicFace's Kannada cards
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440001-1111-4aaa-bbbb-222222222222',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		current_date - interval '14 days',
		current_date - interval '14 days',
		'active',
		'kan',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440002-2222-4aaa-bbbb-222222222222',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		current_date - interval '14 days',
		current_date - interval '14 days',
		'active',
		'kan',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440003-3333-4aaa-bbbb-222222222222',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		current_date - interval '12 days',
		current_date - interval '12 days',
		'active',
		'kan',
		'forward'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa440004-4444-4aaa-bbbb-222222222222',
		'aa110006-6666-4aaa-bbbb-cccccccccccc',
		current_date - interval '12 days',
		current_date - interval '12 days',
		'active',
		'kan',
		'forward'
	),
	-- Best Frin's Kannada cards
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa440005-5555-4aaa-bbbb-222222222222',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		current_date - interval '9 days',
		current_date - interval '9 days',
		'active',
		'kan',
		'forward'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa440006-6666-4aaa-bbbb-222222222222',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		current_date - interval '9 days',
		current_date - interval '9 days',
		'active',
		'kan',
		'forward'
	),
	-- Best Frin already has a card for b0fbbe1d-705e in seed.sql
	-- Work Andy's Kannada cards
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa440008-8888-4aaa-bbbb-222222222222',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		current_date - interval '15 days',
		current_date - interval '15 days',
		'active',
		'kan',
		'forward'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa440009-9999-4aaa-bbbb-222222222222',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		current_date - interval '15 days',
		current_date - interval '15 days',
		'active',
		'kan',
		'forward'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa44000a-aaaa-4aaa-bbbb-222222222222',
		'aa110003-3333-4aaa-bbbb-cccccccccccc',
		current_date - interval '15 days',
		current_date - interval '15 days',
		'active',
		'kan',
		'forward'
	);

-- Reverse card copies for all forward cards in this file
insert into
	"public"."user_card" ("uid", "phrase_id", "lang", "status", "direction")
values
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		'hin',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		'hin',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'48edc28c-1530-4549-b48c-f678033a6892',
		'hin',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		'hin',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		'hin',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'48fe0624-f586-4812-a1a5-33c634995671',
		'hin',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		'hin',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa110005-5555-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		'aa110006-6666-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	),
	(
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		'aa110003-3333-4aaa-bbbb-cccccccccccc',
		'kan',
		'active',
		'reverse'
	);

----------------------------------------------------------------------
-- 5. REVIEW HISTORIES for HIN and KAN (multi-day, multi-user)
----------------------------------------------------------------------
-- Review session states (manifests)
insert into
	"public"."user_deck_review_state" ("lang", "uid", "day_session", "created_at", "manifest")
values
	-- GarlicFace Hindi review 3 days ago
	(
		'hin',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		(current_date - 3 + interval '30 minute' - interval '4 hour')::date,
		current_date - 3 + interval '30 minute',
		'["235ce61c-be21-4697-815d-d5aa1a4ff121", "f1f5234e-0426-44f5-a007-b67329a70a81", "170f5fd4-58f8-4b05-aba4-23522f35800f", "0e33be07-6d4a-4c99-8282-921038188cbf", "7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb"]'
	),
	-- GarlicFace Hindi review 1 day ago
	(
		'hin',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		(current_date - 1 + interval '30 minute' - interval '4 hour')::date,
		current_date - 1 + interval '30 minute',
		'["9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471", "fae20b24-42dc-4b9e-aebc-22afcdfc4689", "48edc28c-1530-4549-b48c-f678033a6892", "cc3847f3-b151-401e-80c9-4aef221c54b5", "8167b776-fc93-4e3f-b06e-5fa5818f2d3b"]'
	),
	-- GarlicFace Kannada review 2 days ago
	(
		'kan',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		(current_date - 2 + interval '45 minute' - interval '4 hour')::date,
		current_date - 2 + interval '45 minute',
		'["b9e3edac-de8b-4796-b436-a0cded08d2ae", "c1cc1a36-1b77-41bf-9a05-6e7914d256e2", "aa110001-1111-4aaa-bbbb-cccccccccccc", "aa110002-2222-4aaa-bbbb-cccccccccccc"]'
	),
	-- Best Frin Kannada review 2 days ago
	(
		'kan',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		(current_date - 2 + interval '60 minute' - interval '4 hour')::date,
		current_date - 2 + interval '60 minute',
		'["aa110004-4444-4aaa-bbbb-cccccccccccc", "aa110008-8888-4aaa-bbbb-cccccccccccc", "b0fbbe1d-705e-4d93-a231-ac55263fcfee"]'
	),
	-- Work Andy Hindi review 1 day ago
	(
		'hin',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		(current_date - 1 + interval '20 minute' - interval '4 hour')::date,
		current_date - 1 + interval '20 minute',
		'["0e33be07-6d4a-4c99-8282-921038188cbf", "48fe0624-f586-4812-a1a5-33c634995671", "7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb"]'
	);

-- Individual card reviews
insert into
	"public"."user_card_review" (
		"id",
		"uid",
		"score",
		"difficulty",
		"stability",
		"review_time_retrievability",
		"created_at",
		"updated_at",
		"day_session",
		"lang",
		"phrase_id",
		"day_first_review",
		"direction"
	)
values
	-- GarlicFace Hindi reviews (3 days ago session)
	(
		'aa550001-1111-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 3 + interval '31 minute',
		current_date - 3 + interval '31 minute',
		(current_date - 3 + interval '31 minute' - interval '4 hour')::date,
		'hin',
		'235ce61c-be21-4697-815d-d5aa1a4ff121',
		true,
		'forward'
	),
	(
		'aa550002-2222-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 3 + interval '32 minute',
		current_date - 3 + interval '32 minute',
		(current_date - 3 + interval '32 minute' - interval '4 hour')::date,
		'hin',
		'f1f5234e-0426-44f5-a007-b67329a70a81',
		true,
		'forward'
	),
	(
		'aa550003-3333-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		6.48830526847145,
		1.18385,
		null,
		current_date - 3 + interval '33 minute',
		current_date - 3 + interval '33 minute',
		(current_date - 3 + interval '33 minute' - interval '4 hour')::date,
		'hin',
		'170f5fd4-58f8-4b05-aba4-23522f35800f',
		true,
		'forward'
	),
	(
		'aa550004-4444-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 3 + interval '34 minute',
		current_date - 3 + interval '34 minute',
		(current_date - 3 + interval '34 minute' - interval '4 hour')::date,
		'hin',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		true,
		'forward'
	),
	(
		'aa550005-5555-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 3 + interval '35 minute',
		current_date - 3 + interval '35 minute',
		(current_date - 3 + interval '35 minute' - interval '4 hour')::date,
		'hin',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		true,
		'forward'
	),
	-- GarlicFace Hindi reviews (1 day ago - second pass, better scores)
	(
		'aa550006-6666-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		0.95,
		current_date - 1 + interval '31 minute',
		current_date - 1 + interval '31 minute',
		(current_date - 1 + interval '31 minute' - interval '4 hour')::date,
		'hin',
		'9a2bc2c8-7d7a-4ddd-8eed-2812bbf73471',
		true,
		'forward'
	),
	(
		'aa550007-7777-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.27296793128744,
		3.20930802809924,
		0.88,
		current_date - 1 + interval '32 minute',
		current_date - 1 + interval '32 minute',
		(current_date - 1 + interval '32 minute' - interval '4 hour')::date,
		'hin',
		'fae20b24-42dc-4b9e-aebc-22afcdfc4689',
		true,
		'forward'
	),
	(
		'aa550008-8888-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		2.13012145996701,
		15.69105,
		0.92,
		current_date - 1 + interval '33 minute',
		current_date - 1 + interval '33 minute',
		(current_date - 1 + interval '33 minute' - interval '4 hour')::date,
		'hin',
		'48edc28c-1530-4549-b48c-f678033a6892',
		true,
		'forward'
	),
	(
		'aa550009-9999-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		7.04050154739082,
		1.18385,
		0.75,
		current_date - 1 + interval '34 minute',
		current_date - 1 + interval '34 minute',
		(current_date - 1 + interval '34 minute' - interval '4 hour')::date,
		'hin',
		'cc3847f3-b151-401e-80c9-4aef221c54b5',
		true,
		'forward'
	),
	(
		'aa55000a-aaaa-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		0.85,
		current_date - 1 + interval '35 minute',
		current_date - 1 + interval '35 minute',
		(current_date - 1 + interval '35 minute' - interval '4 hour')::date,
		'hin',
		'8167b776-fc93-4e3f-b06e-5fa5818f2d3b',
		true,
		'forward'
	),
	-- GarlicFace Kannada reviews (2 days ago)
	(
		'aa55000b-bbbb-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 2 + interval '46 minute',
		current_date - 2 + interval '46 minute',
		(current_date - 2 + interval '46 minute' - interval '4 hour')::date,
		'kan',
		'b9e3edac-de8b-4796-b436-a0cded08d2ae',
		true,
		'forward'
	),
	(
		'aa55000c-cccc-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 2 + interval '47 minute',
		current_date - 2 + interval '47 minute',
		(current_date - 2 + interval '47 minute' - interval '4 hour')::date,
		'kan',
		'c1cc1a36-1b77-41bf-9a05-6e7914d256e2',
		true,
		'forward'
	),
	(
		'aa55000d-dddd-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		2,
		6.48830526847145,
		1.18385,
		null,
		current_date - 2 + interval '48 minute',
		current_date - 2 + interval '48 minute',
		(current_date - 2 + interval '48 minute' - interval '4 hour')::date,
		'kan',
		'aa110001-1111-4aaa-bbbb-cccccccccccc',
		true,
		'forward'
	),
	(
		'aa55000e-eeee-4aaa-bbbb-333333333333',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 2 + interval '49 minute',
		current_date - 2 + interval '49 minute',
		(current_date - 2 + interval '49 minute' - interval '4 hour')::date,
		'kan',
		'aa110002-2222-4aaa-bbbb-cccccccccccc',
		true,
		'forward'
	),
	-- Best Frin Kannada reviews (2 days ago)
	(
		'aa55000f-ffff-4aaa-bbbb-333333333333',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		3,
		5.282434422319,
		3.173,
		null,
		current_date - 2 + interval '61 minute',
		current_date - 2 + interval '61 minute',
		(current_date - 2 + interval '61 minute' - interval '4 hour')::date,
		'kan',
		'aa110004-4444-4aaa-bbbb-cccccccccccc',
		true,
		'forward'
	),
	(
		'aa550010-0001-4aaa-bbbb-333333333333',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		4,
		3.22450158937137,
		15.69105,
		null,
		current_date - 2 + interval '62 minute',
		current_date - 2 + interval '62 minute',
		(current_date - 2 + interval '62 minute' - interval '4 hour')::date,
		'kan',
		'aa110008-8888-4aaa-bbbb-cccccccccccc',
		true,
		'forward'
	),
	(
		'aa550011-0002-4aaa-bbbb-333333333333',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
		2,
		6.48830526847145,
		1.18385,
		null,
		current_date - 2 + interval '63 minute',
		current_date - 2 + interval '63 minute',
		(current_date - 2 + interval '63 minute' - interval '4 hour')::date,
		'kan',
		'b0fbbe1d-705e-4d93-a231-ac55263fcfee',
		true,
		'forward'
	),
	-- Work Andy Hindi reviews (1 day ago - high scores, fluent speaker)
	(
		'aa550012-0003-4aaa-bbbb-333333333333',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		4,
		1,
		15.69105,
		null,
		current_date - 1 + interval '21 minute',
		current_date - 1 + interval '21 minute',
		(current_date - 1 + interval '21 minute' - interval '4 hour')::date,
		'hin',
		'0e33be07-6d4a-4c99-8282-921038188cbf',
		true,
		'forward'
	),
	(
		'aa550013-0004-4aaa-bbbb-333333333333',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		4,
		1,
		15.69105,
		null,
		current_date - 1 + interval '22 minute',
		current_date - 1 + interval '22 minute',
		(current_date - 1 + interval '22 minute' - interval '4 hour')::date,
		'hin',
		'48fe0624-f586-4812-a1a5-33c634995671',
		true,
		'forward'
	),
	(
		'aa550014-0005-4aaa-bbbb-333333333333',
		'a32f65e7-a496-4afc-abd3-798d8e6d9ec5',
		4,
		1,
		15.69105,
		null,
		current_date - 1 + interval '23 minute',
		current_date - 1 + interval '23 minute',
		(current_date - 1 + interval '23 minute' - interval '4 hour')::date,
		'hin',
		'7dd33e23-2b6d-4b1f-bc8c-1da690d14bfb',
		true,
		'forward'
	);
