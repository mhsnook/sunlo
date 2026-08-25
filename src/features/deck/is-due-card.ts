import type { CardScheduling } from './card-scheduling'
import { retrievability } from '@/features/review/fsrs'
import { dateDiff } from '@/lib/utils'

/**
 * Due means active, previously reviewed, and retrievability down to 0.9 or
 * below. Null scheduling is not due — that covers a card with no reviews and
 * one whose reviews have not loaded yet, and the two are indistinguishable
 * here.
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
