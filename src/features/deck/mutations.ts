import { useNavigate } from '@tanstack/react-router'
import { toastError, toastSuccess } from '@/components/ui/sonner'

import { useUserId } from '@/lib/use-auth'
import languages from '@/lib/languages'
import { decksCollection } from './collections'
import { DeckMetaSchema, type DeckMetaType } from './schemas'

/**
 * The optimistic user_deck row for a brand-new deck. Every column has a fixed
 * base-table default (learning_goal 'moving', archived false, daily_review_goal
 * 15, preferred_translation_lang / review_answer_mode null), so the row is exact
 * and decksCollection.onInsert can skip the reconciliation refetch.
 */
export function optimisticNewDeck(lang: string, uid: string): DeckMetaType {
	return DeckMetaSchema.parse({
		uid,
		lang,
		language: languages[lang] ?? lang,
		learning_goal: 'moving',
		archived: false,
		daily_review_goal: 15,
		preferred_translation_lang: null,
		review_answer_mode: null,
		created_at: new Date().toISOString(),
	})
}

/**
 * Returns a `createDeck(lang)` that optimistically inserts the new deck and
 * navigates to it immediately. Persistence lives on decksCollection.onInsert; on
 * rollback the deck page's own "no deck" branch handles it and the error toast
 * explains why.
 */
export function useCreateDeck() {
	const navigate = useNavigate()
	const userId = useUserId()

	return (lang: string) => {
		const tx = decksCollection.insert(optimisticNewDeck(lang, userId!))
		tx.isPersisted.promise.then(
			() => toastSuccess(`Created a new deck to learn ${languages[lang]}`),
			(err: unknown) => {
				console.error('Error creating deck:', err)
				const message = err instanceof Error ? err.message : 'unknown error'
				toastError(`Error creating deck: ${message}`)
			}
		)
		void navigate({ to: `/learn/$lang`, params: { lang } })
	}
}
