# learner browses a language's cards, sets, and discussions

learner:

- login
- openTo /browse/[team.lang_full]
- see browse-lang-page
- see browse-topic-chips
- see browse-sets-section
- see browse-cards-section
- see browse-requests-section

# learner filters the browse page to a single tab

learner:

- login
- openTo /browse/[team.lang_full]
- see browse-lang-page
- click browse-tab-cards
- up
- see browse-cards-section
- notSee browse-sets-section

# visitor can browse a language without logging in

visitor:

- openTo /browse/[team.lang_full]
- see browse-lang-page
- see browse-cards-section
