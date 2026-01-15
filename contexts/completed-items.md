During v0.4 - Before v0.5
Deployments in Jan 2026

**16h Jan**

- **15th Jan**

- (c1, d1) A. Fix: Embeds not working in production (bdd0e7e9)
- (c1, d1) AB. Fix: Poor RLS performance for chat messages (16b3f200)
- (c1, d1) B. Feature: Add Dyslexie/OpenDyslexic font support (8ca64970)
- (c1, d2) Feature L: Browse page search box, w filters (bc04dc1a)

**14th Jan**

- (c3, d2) Refactor: meta_phrase_info into phrase_meta, do less, more reliably
- (c1, d1) Fix: review buttons were all one colour
- (c1, d1) Fix ago() returning '1 mo ago' for null dates (e723a944)
- (c1, d1) Fix /learn/undefined should 404 (45b04d8e - prior work)
- (c1, d1) Fix DialogContent aria-labelledby/description warnings (a73a4fbf)
- (c1, d1) Make default theme 'light' (85474e8f)
- (c1, d1) Add 'add to deck' option to bulk-add (746f3073)
- (c1, d1) Add 'learned' and 'skip' options to review context menu (4da341d1)

**11th - 12th Jan**

- (c1, d1) Fix: Loading spinner creating scrollbars
- (c3, d2) Add: react compiler, remove linter cruft
- (c1, d1) Chore: Remove these console logs `We expected a userId here`
- (c1, d1) Fix: convert the PlusMenu to standard shadcn menu
- (c1, d1) Design: Try font "Instrument Sans"
- (c1, d1) Design: Use Bookmark\* icons to card status
- (c1, d1) Feat: throw notFound() for /learn/{whatever}
- (c1, d1) Changing card status updates the phrase's metadata (count_learners) etc

**10th Jan**

- (c3, d3) When you try to add a phrase but you don't have a deck for that language, a checkbox gives you the option to start learning (or re-activate) that deck, or to create the new phrase without one.
- (c2, d2) Deck-configurable preferred translation lang
- (c1, d1) Fix Typescript Errors in Bulk-Add.tsx
- (c3, d3) Public mode
