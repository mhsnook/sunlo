import type { CardMetaType } from './schemas'
import { retrievability } from '@/features/review/fsrs'
import { dateDiff } from '@/lib/utils'

/** A card is "due" when it's active, has been reviewed, and retrievability has dropped to 0.9 or below */
export function isDueCard(card: CardMetaType): boolean {
	if (card.status !== 'active') return false
	if (!card.last_reviewed_at || !card.stability) return false
	return retrievability(dateDiff(card.last_reviewed_at), card.stability) <= 0.9
}
