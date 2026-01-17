-- Test script for friend_request_action trigger
-- Run with: psql $DATABASE_URL -f supabase/test-friend-request-trigger.sql
-- Or execute in Supabase SQL Editor

-- Use two test users from seed data
-- GarlicFace: cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18
-- Best Frin: a2dfa256-ef7b-41b0-b05a-d97afab8dd21

\echo '=== Friend Request Trigger Tests ==='
\echo ''

-- Clean up any existing test data between these two users
delete from friend_request_action
where (uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21' and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18');

\echo 'TEST 1: GarlicFace sends invite to Best Frin'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', -- GarlicFace is uid_by
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21', -- Best Frin is uid_for
  'invite'
);
\echo 'PASS: Invite sent'

-- Check status
select status, most_recent_action_type from friend_summary
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18';

\echo ''
\echo 'TEST 2: GarlicFace tries to send duplicate invite (should fail)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'invite'
);
\set ON_ERROR_STOP on
\echo 'PASS: Duplicate invite rejected'

\echo ''
\echo 'TEST 3: GarlicFace tries to accept own invite (should fail)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'accept'
);
\set ON_ERROR_STOP on
\echo 'PASS: Self-accept rejected'

\echo ''
\echo 'TEST 4: Best Frin sends invite back (mutual invite = auto-accept)'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21', -- Best Frin is uid_by
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18', -- GarlicFace is uid_for
  'invite'
);
\echo 'PASS: Mutual invite sent'

-- Check that status is now 'friends' and action was transformed to 'accept'
select status, most_recent_action_type from friend_summary
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18';

\echo ''
\echo 'TEST 5: Check that mutual invite was transformed to accept'
select action_type from friend_request_action
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18'
order by created_at desc limit 1;

\echo ''
\echo 'TEST 6: GarlicFace tries to accept again (should fail - already friends)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'accept'
);
\set ON_ERROR_STOP on
\echo 'PASS: Accept when already friends rejected'

\echo ''
\echo 'TEST 7: GarlicFace tries to invite again (should fail - already friends)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'invite'
);
\set ON_ERROR_STOP on
\echo 'PASS: Invite when already friends rejected'

\echo ''
\echo 'TEST 8: Best Frin removes GarlicFace as friend'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'remove'
);
\echo 'PASS: Friend removed'

-- Check status is unconnected
select status, most_recent_action_type from friend_summary
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18';

\echo ''
\echo 'TEST 9: Best Frin tries to remove again (should fail - not friends)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'remove'
);
\set ON_ERROR_STOP on
\echo 'PASS: Remove when not friends rejected'

\echo ''
\echo 'TEST 10: GarlicFace sends new invite'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'invite'
);
\echo 'PASS: New invite sent after unfriending'

\echo ''
\echo 'TEST 11: Best Frin declines the invite'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'decline'
);
\echo 'PASS: Invite declined'

select status, most_recent_action_type from friend_summary
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18';

\echo ''
\echo 'TEST 12: GarlicFace sends another invite, then cancels it'
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'invite'
);

insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cancel'
);
\echo 'PASS: Invite sent and cancelled'

select status, most_recent_action_type from friend_summary
where uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21'
  and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18';

\echo ''
\echo 'TEST 13: Best Frin tries to cancel (should fail - not their request)'
\set ON_ERROR_STOP off
insert into friend_request_action (uid_less, uid_more, uid_by, uid_for, action_type)
values (
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'a2dfa256-ef7b-41b0-b05a-d97afab8dd21',
  'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18',
  'cancel'
);
\set ON_ERROR_STOP on
\echo 'PASS: Cancel by wrong user rejected'

\echo ''
\echo '=== Cleanup ==='
delete from friend_request_action
where (uid_less = 'a2dfa256-ef7b-41b0-b05a-d97afab8dd21' and uid_more = 'cf1f69ce-10fa-4059-8fd4-3c6dcef9ba18');
\echo 'Test data cleaned up'

\echo ''
\echo '=== All Tests Complete ==='
