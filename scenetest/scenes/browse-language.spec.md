# learner browses a language's cards, sets, and discussions

learner:

- login
- openTo /browse/[team.lang_full]
- see browse-lang-page
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

# see-more on a section expands into that tab without leaving the page

learner:

- login
- openTo /browse/[team.lang_full]
- see browse-lang-page
- see browse-sets-section
- click browse-sets-section browse-see-more
- up
- see browse-sets-section
- notSee browse-cards-section

# visitor can browse a language without logging in

visitor:

- openTo /browse/[team.lang_full]
- see browse-lang-page
- see browse-cards-section
