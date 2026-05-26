# deck-scoped appnav stays hidden when the user has no deck for this language

// \_user.tsx gates the deck-scoped appnav (feed/review/contributions/stats)
// behind useDeckMeta — without an active deck for the current $lang, the
// sidebar links would just lead to empty/dead pages, so they're hidden.

cleanup: supabase.from('user_card').delete().eq('uid', '[new-user.key]').eq('lang', '[team.lang_full]')
cleanup: supabase.from('user_deck').delete().eq('uid', '[new-user.key]').eq('lang', '[team.lang_full]')

new-user:

- login
- openTo /learn/[team.lang_full]
- up
- see deck-feed-page
- notSee appnav-feed

# deck-scoped appnav shows when the user has an active deck for this language

// learner has a seeded deck for the team's primary lang, so the deck-scoped
// links render.

learner:

- login
- openTo /learn/[team.lang_full]
- up
- see deck-feed-page
- see appnav-feed
