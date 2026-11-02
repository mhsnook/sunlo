# Test IDs in the admin app

The admin app puts `data-testid` on what a test would click or read, the
same way the main app does (`scenetest/TEST_IDS.md` has the selector
conventions). No test reads these yet: there are no admin scene specs, and
the Worker's tests call functions. The ids are here so a scene can be
written without first instrumenting the page, and so a pull request that
only touches the admin app changes nothing outside `apps/admin/`.

Register a new id here, not in the main app's registry.

## The activity dashboard at `/activity`

| Selector                                   | Purpose                                                 |
| ------------------------------------------ | ------------------------------------------------------- |
| `admin-stat-tile`                          | Headline number tile (active users, new users, reviews) |
| `admin-metric-panel` + `data-key=<metric>` | Daily chart panel for one metric (e.g. `reviews`)       |
| `admin-range-option` + `data-key=<days>`   | Date range link: 7, 14 or 30 days                       |

## The Common Room at `/`, and each subject's room at `/room/<room>`

| Selector                                                                                                  | Purpose                                                                                                         |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `crew-sidebar-item` + `data-key=<crew\|room>`                                                             | Sidebar link to the Common Room or a subject's room                                                             |
| `crew-sidebar-unread`, `crew-sidebar-cards`                                                               | A sidebar item's unread count, and its count of cards that wait on you                                          |
| `crew-message-group` + `data-key=<message id>`                                                            | Consecutive messages from one author                                                                            |
| `crew-message` + `data-key=<message id>` (`data-pending` until the server has it)                         | One message in the room                                                                                         |
| `crew-new-since`                                                                                          | The "New since …" line                                                                                          |
| `crew-working`                                                                                            | "<name> is working…" under the timeline                                                                         |
| `crew-live-runs`                                                                                          | The steps of each running agent since its last message, under the working marker                                |
| `run-steps` + `data-key=<run id>` (`data-outcome=working\|done\|failed`), `run-steps-toggle`, `run-error` | One run's steps under their summary line ("Worked in 4 steps"), the line's toggle, and why a failed run stopped |
| `run-steps` + `data-place=above\|under\|live`                                                             | Where a run's part sits: above or under one message, or in the live list. Unique per message with data-key      |
| `crew-github-lines`, `crew-github-line` + `data-key=<message id>`                                         | GitHub's lines in the Product room, and one line                                                                |
| `run-step` + `data-key=<tool call id, or turn:block for thinking>`                                        | One step of a run: a tool call, or the model's thinking                                                         |
| `crew-card-action` + `data-key=<action id>`                                                               | A button on an agent's card (`do`, `not-yet`, `keep`, ...)                                                      |
| `crew-card-dismiss`, `crew-card-feedback`, `crew-card-dismiss-send`                                       | A card's Dismiss button, its optional feedback box, and the button that sends it                                |
| `crew-other-view` + `data-key=<message id>`, `crew-other-view-toggle`                                     | An associate's second view, folded under the principal's message, and its toggle                                |
| `crew-pick` + `data-key=<original\|other>`, `crew-picked`                                                 | The buttons that go with one of the two views, and the note once one is picked                                  |
| `crew-thread` + `data-key=<message id>`, `crew-thread-toggle`                                             | A side-thread folded under its first message, and its toggle                                                    |
| `crew-thread-reply` + `data-key=<message id>`                                                             | One reply in an open side-thread                                                                                |
| `crew-card-copy`                                                                                          | A card's Copy brief button                                                                                      |
| `crew-card-file`, `crew-card-edit`                                                                        | A GitHub draft card's File it and Edit buttons                                                                  |
| `crew-card-error`                                                                                         | Why a GitHub draft was not filed                                                                                |
| `crew-card-filed`                                                                                         | The link to what a filed GitHub card became                                                                     |
| `sketch` + `data-key=<sketch id>`, `sketch-image`                                                         | One mockup on a sketches card, and its picture                                                                  |
| `sketch-copy-brief`                                                                                       | A mockup's Copy brief button                                                                                    |
| `picture-copy-image`, `picture-download`                                                                  | A mockup's or a painting's Copy image and Download buttons                                                      |
| `painting` + `data-key=<painting id>`, `painting-failed`                                                  | One painting on a paintings card, and the box a failed style shows instead                                      |
| `painting-open`, `painting-image`                                                                         | A painting's or SVG's thumbnail button, and its picture                                                         |
| `svg-tile` + `data-key=<svg id>`                                                                          | One SVG on an SVGs card                                                                                         |
| `svg-copy`, `svg-download`                                                                                | An SVG's Copy SVG and Download buttons, on either card                                                          |
| `painter-styles`, `painter-style-add`                                                                     | The painter styles in the Product room's details, and the Add a style button                                    |
| `painter-style` + `data-key=<name>`, `painter-style-toggle`, `painter-style-prompt`                       | One style, the button that opens it, and its prompt                                                             |
| `painter-style-edit`, `painter-style-delete`                                                              | A style's Edit and Delete buttons                                                                               |
| `painter-style-delete-dialog`, `painter-style-delete-confirm`                                             | The dialog that asks before a style is deleted, and its Delete button                                           |
| `painter-style-form`, `painter-style-name`, `painter-style-description`                                   | The form that adds or edits a style, and its fields                                                             |
| `painter-style-prompt-input`, `painter-style-model`, `painter-style-model-option` + `data-key=<model id>` | The form's prompt, its model menu, and one model in it                                                          |
| `painter-style-example` + `data-key=<image id>`, `painter-style-example-remove`, `painter-style-save`     | An example the style keeps, its Remove button, and the form's Save button                                       |
| `github-draft`, `github-draft-editor`                                                                     | A GitHub draft card's draft, and its editor                                                                     |
| `github-draft-title`, `github-draft-labels`, `github-draft-due`, `github-draft-body`                      | The editor's fields                                                                                             |
| `github-draft-note`                                                                                       | A GitHub draft card's "Note to <agent>" box                                                                     |
| `crew-message-note-on`                                                                                    | The line under the admin's note that names the card it was written with                                         |
| `voice-mic` (`data-state=idle\|recording\|transcribing`), `voice-replies`                                 | The mic and the voice-replies toggle in a compose bar                                                           |
| `voice-read` + `data-key=<message id>`                                                                    | The read-aloud button beside an agent's message                                                                 |
| `crew-compose-input`, `crew-compose-send`                                                                 | The room's compose bar                                                                                          |
| `compose-add-image`, `compose-image-input`                                                                | A compose bar's Add an image button, and its hidden file input                                                  |
| `compose-images`, `compose-image` + `data-key=<draft key>`, `compose-image-remove`                        | The images waiting in a compose bar, one of them, and its Remove button                                         |
| `compose-image-pending` + `data-key=<draft key>`                                                          | The place of an image in a compose bar while it is scaled down                                                  |
| `crew-message-images`, `crew-message-image` + `data-key=<image id>`                                       | A message's images, and one thumbnail; opens it full size                                                       |
| `crew-image-full`                                                                                         | The full-size view of a message's image, a painting or an SVG                                                   |
| `crew-clef-chip`                                                                                          | A rule's place for the draft, or "CLEF decides"; opens the menu                                                 |
| `crew-routing-option` + `data-key=<kind><agents>`                                                         | One choice in a routing menu, e.g. `routeproduct-1`, `room`, `stack`                                            |
| `crew-routing-everyone-option` + `data-key=<agent>`                                                       | One agent's check in the menu of a message to everyone                                                          |
| `crew-routing-correct`                                                                                    | The routing note under your own message; opens the menu to correct it                                           |
| `details-button`, `details-panel` + `data-key=<room\|crew>`                                               | The Details toggle in a room header, and its panel; `crew` is the Common Room                                   |
| `details-section` + `data-key=<documents\|charter\|weekly\|overview\|github\|painter-styles\|agent key>`  | One section of the details; on a phone, one fold of the accordion                                               |
| `github-log`, `github-item` + `data-key=<number>`                                                         | What is open on GitHub, in the Product room's details, and one issue or pull request                            |
| `crew-overview`                                                                                           | The Overview section, in the Common Room's details                                                              |
| `room-document` + `data-key=<name>`                                                                       | A document in the details; a link that opens it                                                                 |
| `crew-document-link` + `data-key=<name>`                                                                  | A `doc:` link an agent wrote in a message or a document                                                         |
| `crew-document-card` + `data-key=<name>`                                                                  | The card a `doc:` link shows on hover: the document's current name, room and revision                           |
| `document-back`                                                                                           | Closes a document, back to the details                                                                          |
| `document` + `data-key=<name>`                                                                            | An open document: the Situation Report, or one from a room's details                                            |
| `document-text`                                                                                           | A document's current text, drawn                                                                                |
| `document-edit`, `document-editor`                                                                        | The Edit button, and the Markdown box it opens                                                                  |
| `document-summary`, `document-save`                                                                       | The editor's "What changed" line, and its Save button                                                           |
| `document-stale`                                                                                          | The editor's note that someone saved a newer revision                                                           |
| `document-history-button`, `document-revisions`                                                           | The History toggle, and the revision list                                                                       |
| `document-revision` + `data-key=<revision>`                                                               | One revision in the list; shows it                                                                              |
| `document-old-revision`, `document-restore`                                                               | An older revision on view, and its Restore button                                                               |
| `crew-diagram-error`                                                                                      | A Mermaid diagram that did not draw, shown as its source                                                        |
| `common-knowledge-button`, `common-knowledge`                                                             | The crew's charter (Common Knowledge in the code): its toggle and its panel                                     |
| `common-knowledge-entry` + `data-key=<id>`, `common-knowledge-input`, `common-knowledge-add`              | One entry in the crew's charter, and the box and button that add one                                            |
| `crew-overview-range` + `data-key=<days>`                                                                 | Date range button in the Overview                                                                               |
| `crew-overview-card` + `data-key=<metrics>`                                                               | One chart card in the Overview                                                                                  |
| `agent-looks-after`                                                                                       | The "Looks after" list in a member's profile card                                                               |
| `agent-not-started`                                                                                       | The note on a planned officer's profile card                                                                    |
| `agent-todos`, `agent-todo` + `data-key=<id>`                                                             | The workspace to-do list and one to-do                                                                          |
| `agent-todo-done`                                                                                         | The box that ticks a to-do done, or not done                                                                    |
| `agent-todo-add`, `agent-todo-add-input`, `agent-todo-add-button`                                         | The box and button that add a to-do for an agent                                                                |
| `agent-character` + `data-key=<agent>`, `agent-character-toggle`, `agent-character-text`                  | An officer's character in the room's details, its fold, and its text                                            |
| `agent-character-edit`, `agent-character-input`, `agent-character-save`                                   | Editing an officer's character                                                                                  |
| `agent-character-restore`                                                                                 | "Restore the original", shown once the admin has written their own version                                      |
| `agent-open-item` + `data-key=<id>`                                                                       | One "Open with you" item                                                                                        |
| `agent-memory`                                                                                            | The workspace memory list                                                                                       |
| `agent-memory-entry` + `data-key=<id>`                                                                    | One memory or playbook entry, with its delete button                                                            |
| `agent-memory-add`, `agent-memory-add-input`, `agent-memory-add-button`                                   | The box and button that add a memory for an agent                                                               |
| `crew-block` + `data-key=<chart\|stats\|table\|mermaid>`                                                  | A component an agent put in its message                                                                         |
| `crew-block-filter`                                                                                       | The filter box on a filterable table component                                                                  |
| `crew-meeting-banner`, `crew-go-to-meeting`                                                               | The weekly meeting invitation and its link to the Command room                                                  |
| `room-compose-input`, `room-compose-send`                                                                 | A subject room's compose bar                                                                                    |
| `room-start-meeting`                                                                                      | "Start the weekly meeting" in the Command room, while the meeting is due                                        |
| `room-card` + `data-key=<kind>`                                                                           | A card in a subject's room (`decide`, ...); a folded `brief` or `report` is its preview                         |
| `room-member` + `data-key=<agent>`                                                                        | One member's profile, to-dos, open items and memory in the room details                                         |
| `charter-panel` + `data-key=<room>`, `charter-entry` + `data-key=<id>`                                    | A room's charter in its log, and one kept entry                                                                 |
| `charter-add`, `charter-add-input`, `charter-add-button` + `data-key=<button label>`                      | The box that writes a charter entry, and its "Add a principle" and "Add a lesson"                               |
| `brief-timezone`                                                                                          | The time zone of the Sunday brief                                                                               |
