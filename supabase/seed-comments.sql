
-- Seed data for comment system
-- Add sample comments and comment-phrase links for testing

-- Add some top-level comments on the Hindi request
INSERT INTO "public"."request_comment" (
	"id",
	"request_id",
	"parent_comment_id",
	"commenter_uid",
	"content",
	"created_at",
	"upvote_count"
)
VALUES
	-- Comment with text and phrases
	(
		'11111111-1111-1111-1111-111111111111',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986', -- Hindi cheeseburger request
		NULL::uuid, -- top-level
		'7ad846a9-d55b-4035-8be2-dbcc70074f74', -- Lexigrine (friend)
		'Here are a couple ways you could say that!',
		now() - interval '2 days 2 hours',
		2
	),
	-- Pure text comment
	(
		'22222222-2222-2222-2222-222222222222',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		NULL::uuid,
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21', -- Best Frin
		'You could also try asking at a restaurant - they usually understand "cheeseburger" even in Hindi!',
		now() - interval '1 day 5 hours',
		1
	),
	-- Reply to first comment
	(
		'33333333-3333-3333-3333-333333333333',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		'11111111-1111-1111-1111-111111111111', -- reply to first comment
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', -- GarlicFace
		'Thank you so much! These are perfect 🙏',
		now() - interval '1 day 23 hours',
		0
	);

-- Link phrases to the first comment
INSERT INTO "public"."comment_phrase_link" (
	"id",
	"request_id",
	"comment_id",
	"phrase_id",
	"created_at"
)
VALUES
	(
		'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		'11111111-1111-1111-1111-111111111111',
		'1395ae94-46d9-4a54-92f5-fb8b76db896b', -- "haanji"
		now() - interval '2 days 2 hours'
	),
	(
		'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
		'e0d3a74e-4fe7-43c0-aa35-d05c83929986',
		'11111111-1111-1111-1111-111111111111',
		'f878e60f-9647-4728-a368-fc8681b0acbb', -- "nahi"
		now() - interval '2 days 2 hours'
	);

-- Add upvotes for comments
INSERT INTO "public"."comment_upvote" (
	"id",
	"comment_id",
	"uid",
	"created_at"
)
VALUES
	(
		'99999999-9999-9999-9999-999999999991',
		'11111111-1111-1111-1111-111111111111',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', -- GarlicFace upvoted
		now() - interval '2 days'
	),
	(
		'99999999-9999-9999-9999-999999999992',
		'11111111-1111-1111-1111-111111111111',
		'a2dfa256-ef7b-41b0-b05a-d97afab8dd21', -- Best Frin upvoted
		now() - interval '1 day 20 hours'
	),
	(
		'99999999-9999-9999-9999-999999999993',
		'22222222-2222-2222-2222-222222222222',
		'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', -- GarlicFace upvoted
		now() - interval '1 day 4 hours'
	);
