# learner browses Hindi playlists

learner:

- login
- openTo /learn/hin/playlists
- up
- see playlist-list
- seeText Essential Hindi Greetings
- seeText Hindi Questions
- seeText Hindi Numbers and Counting
- seeText Hindi Travel Phrases

# learner browses Kannada playlists

learner:

- login
- openTo /learn/kan/playlists
- up
- see playlist-list
- seeText Basic Kannada Phrases
- seeText Kannada Food & Dining

# learner opens a Kannada playlist and sees linked phrases

learner:

- login
- openTo /learn/kan/playlists
- up
- click playlist-item c3d4e5f6-3333-4444-5555-666666666666
- up
- see playlist-detail-page
- see playlist-phrase-list

// Note: Scenes for creating playlists (with phrase picker flow) and
// upvoting playlists are tracked in playlists-hin-kan.spec.skip.md.
// They require either `setup:` directives or use template variables
// like [testStart] that scenetest v0.2.0 does not yet support.
