# learner opens the search overlay from /browse by clicking the trigger

learner:

- login
- openTo /browse
- see browse-page
- see browse-search-trigger
- click browse-search-trigger
- see browse-search-overlay
- typeInto browse-search-input tea
- see browse-search-results

# learner opens the search overlay by visiting /browse?search=true directly

// Regression guard: the overlay used to live in the /learn layout, so
// moving /browse out from under /learn silently broke this deep link.

learner:

- login
- openTo /browse?search=true
- see browse-search-overlay
- see browse-search-input

# visitor can use the search overlay on /browse without logging in

visitor:

- openTo /browse?search=true
- see browse-search-overlay
- see browse-search-input
