# learner views comments with replies on a Hindi request

learner:

- login
- openTo /learn/hin/requests/e0d3a74e-4fe7-43c0-aa35-d05c83929986
- up
- see request-detail-page
- see comment-item c0000001-1111-2222-3333-444444444444

# learner views comments with phrase links on a Kannada request

learner:

- login
- openTo /learn/kan/requests/e40e53ce-0b24-4b5d-9cf4-5c1ac16d4f96
- up
- see request-detail-page
- see comment-item c0000003-3333-4444-5555-666666666666

// Note: Scenes for posting comments, replying, attaching phrase links,
// upvoting requests, and cross-actor notification flows are tracked in
// comments-and-answers.spec.skip.md. They require multi-actor flows
// with [testStart] template variables that scenetest v0.2.0 does not
// yet support in cleanup directives.
