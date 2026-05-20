// Migrated from e2e/mutations/cards.spec.ts.
//
// The old Playwright spec scraped DB / collection state directly
// (window.__cardsCollection, getCardByPhraseId, CardMetaSchema matchObject).
// Those invariants now live as serverCheck() inline checks on
// cardsCollection.onInsert / onUpdate (src/features/deck/collections.ts) and
// in card-status-dropdown.tsx — so this spec only drives the user journey
// and asserts user-visible outcomes. The inline checks fire as the card is
// inserted and updated, confirming the server row matches the optimistic
// collection value.
//
// NOTE: the old test also checked the new phrase appears under
// /learn/$lang/contributions. That is really a contributions-page concern
// and is intentionally left for a future contributions spec, not silently
// folded in here.

import { test } from '@scenetest/scenes'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/supabase'

const supabase = createClient<Database>(
	process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321',
	process.env.SUPABASE_SERVICE_ROLE_KEY!
)

test('learner adds a freshly-created phrase from the feed and cycles its card status', async ({
	actor,
	team,
}) => {
	const lang = team.tags!.lang_full
	const learner = await actor('learner')
	let phraseId = ''

	await learner
		.do(async () => {
			// Idempotent: clear any phrases left by an earlier failed run.
			await supabase
				.from('phrase')
				.delete()
				.eq('added_by', learner.key)
				.like('text', 'Cards scene phrase%')
			const { data: phrase } = await supabase
				.from('phrase')
				.insert({
					lang,
					text: `Cards scene phrase ${Date.now()}`,
					added_by: learner.key,
				})
				.select()
				.single()
				.throwOnError()
			phraseId = phrase!.id
			await supabase
				.from('phrase_translation')
				.insert({
					phrase_id: phraseId,
					lang: 'eng',
					text: 'cards scene translation',
					added_by: learner.key,
				})
				.throwOnError()
		})
		.openTo('/login')
		.typeInto('email-input', learner.email!)
		.typeInto('password-input', learner.password!)
		.click('submit-button')
		.notSee('login-form')
		// the freshly-created phrase shows up as a feed activity item …
		.openTo(`/learn/${lang}/feed`)
		.up()
		.see('deck-feed-page')
		.see(`feed-phrase-link ${phraseId}`)
		// … and links through to its detail page
		.click(`feed-phrase-link ${phraseId}`)
		.up()
		.see('phrase-detail-page')
		// add it to the deck — cardsCollection.onInsert's serverCheck confirms
		// the server row matches the optimistic card
		.click('card-status-dropdown')
		.click('add-to-deck-option')
		.up()
		.seeToast('toast-success')
		// cycle the status — each update fires cardsCollection.onUpdate's
		// serverCheck
		.click('card-status-dropdown')
		.click('set-learned-option')
		.up()
		.seeToast('toast-success')
		.click('card-status-dropdown')
		.click('ignore-card-option')
		.up()
		.seeToast('toast-success')
		.click('card-status-dropdown')
		.click('activate-card-option')
		.up()
		.seeToast('toast-success')
		// reload to confirm the card state re-hydrates cleanly from the server
		.do(async (page) => {
			await page.reload()
		})
		.see('phrase-detail-page')
		.do(async () => {
			// Deleting the phrase cascades to its translation and user_card rows.
			await supabase.from('phrase').delete().eq('id', phraseId).throwOnError()
		})
})
