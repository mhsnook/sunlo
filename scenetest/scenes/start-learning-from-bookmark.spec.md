# onboarded new user bookmarks a phrase in the team's primary language to start learning

// A user who finished onboarding (profile filled in, no decks yet) lands on
// a request page in the team's primary language. The deck-scoped appnav
// should be hidden — they're not learning this language yet. Tapping the
// bookmark on an answer card opens the start-learning dialog; confirming it
// creates their first deck and adds the card, after which the appnav appears.

cleanup: supabase.from('user_card').delete().eq('uid', '[new-user.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_deck').delete().eq('uid', '[new-user.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_profile').update({ username: null, languages_known: [], flags: { 'needs-onboarding': true } }).eq('uid', '[new-user.key]')

setup: supabase.from('user_profile').update({ username: 'NewLearner1', languages_known: [{ lang: 'eng', level: 'fluent' }], flags: { 'needs-onboarding': false } }).eq('uid', '[new-user.key]')

new-user:

- login
- openTo /learn/[team.lang_full]/requests/[team.full_shared_chat_request]
- up
- see request-detail-page
- notSee appnav-feed
- see comment-phrase-link-badge
- click comment-phrase-link-badge card-status-heart #1
- up
- see start-learning-dialog
- click confirm-start-learning-button
- up
- see appnav-feed
