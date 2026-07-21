import * as z from 'zod'

import { cardsCollection } from './collections'
import { CardStatusEnumSchema } from './schemas'
import { phrasesCollection } from '@/features/phrases/collections'

export type LearningStatus = z.infer<typeof CardStatusEnumSchema>

const isLearnerStatus = (s: LearningStatus | undefined) =>
	s === 'active' || s === 'learned' ? 1 : 0

/**
 * count_learners is server-derived (aggregated in the phrase_meta view from
 * user_card status), so phrasesCollection has no mutation handler for it. Apply
 * the predicted delta optimistically and return a reverter to run if the card
 * write rolls back.
 */
export function updatePhraseLearnerCount(
	phraseId: string,
	oldStatus: LearningStatus | undefined,
	newStatus: LearningStatus
): (() => void) | undefined {
	if (oldStatus === newStatus) return
	const previous = phrasesCollection.get(phraseId)
	if (!previous) {
		console.error(
			`updatePhraseLearnerCount: no phrase ${phraseId} in collection`
		)
		return
	}
	phrasesCollection.utils.writeUpdate({
		id: previous.id,
		count_learners: Math.max(
			(previous.count_learners ?? 0) -
				isLearnerStatus(oldStatus) +
				isLearnerStatus(newStatus),
			0
		),
	})
	return () => phrasesCollection.utils.writeUpdate(previous)
}

/**
 * Set a phrase's cards (both directions) to `toStatus` in one optimistic
 * transaction, keeping the denormalized count_learners in sync and reverting it
 * on rollback. Callers own the toast UX via the returned tx's isPersisted.promise.
 */
export function updateCardsStatus(
	cardIds: Array<string>,
	phraseId: string,
	fromStatus: LearningStatus | undefined,
	toStatus: LearningStatus
) {
	const tx = cardsCollection.update(cardIds, (drafts) => {
		drafts.forEach((draft) => {
			draft.status = toStatus
		})
	})
	const revertCount = updatePhraseLearnerCount(phraseId, fromStatus, toStatus)
	if (revertCount) tx.isPersisted.promise.then(undefined, revertCount)
	return tx
}
