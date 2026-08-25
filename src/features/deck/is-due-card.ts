import type { CardScheduling } from './card-scheduling'
import { retrievability } from '@/features/review/fsrs'
import { dateDiff } from '@/lib/utils'

/**
 * A card is "due" when it's active, has been reviewed, and retrievability has
 * dropped to 0.9 or below.
 *
 * Scheduling arrives separately from the card because it is derived from the
 * card's reviews, not stored on the `user_card` row — see
 * `schedulingFromReviews`. Null scheduling reads as not-due, which covers both
 * a card with no reviews and one whose reviews have not arrived yet.
 */
export function isDueCard(
	card: { status: string },
	scheduling: CardScheduling | null
): boolean {
	if (card.status !== 'active') return false
	if (!scheduling?.last_reviewed_at || !scheduling.stability) return false
	return (
		retrievability(
			dateDiff(scheduling.last_reviewed_at),
			scheduling.stability
		) <= 0.9
	)
}
