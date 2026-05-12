import { Link } from '@tanstack/react-router'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	Bookmark,
	BookmarkCheck,
	BookmarkPlus,
	BookmarkX,
	ChevronDown,
	PlusCircle,
} from 'lucide-react'

import { failed, serverCheck, should } from '@scenetest/checks-react'
import { useRequireAuth } from '@/hooks/use-require-auth'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserId } from '@/lib/use-auth'
import {
	useDecks,
	useMyCard,
	type CardWithSibling,
} from '@/features/deck/hooks'
import { Button } from '@/components/ui/button'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import { directionsForPhrase } from '@/features/deck/card-directions'
import {
	PhraseFullFilteredType,
	PhraseFullFullType,
} from '@/features/phrases/schemas'
import type { ActionCopy } from '@/types/main'

type AnyPhrase = PhraseFullFilteredType | PhraseFullFullType
interface CardStatusDropdownProps {
	phrase: AnyPhrase
	className?: string
}

type LearningStatus = 'active' | 'skipped' | 'learned'
type ShowableActions = LearningStatus | 'nodeck' | 'nocard'

export const statusStrings: Record<ShowableActions, Required<ActionCopy>> = {
	active: {
		name: 'Active',
		title: 'Card is in your deck',
		action: 'Activate card',
		actionSecond: 'Add it to your active learning deck',
		done: 'Card added',
		failed: 'There was an error updating this card',
		Icon: Bookmark,
		iconClassName: 'text-primary fill-current/50',
	},
	learned: {
		name: 'Learned',
		title: 'Inactive (learned)',
		action: 'Set "learned"',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Marked "learned"',
		failed: 'There was an error updating this card',
		Icon: BookmarkCheck,
		iconClassName: 'text-green-600',
	},
	skipped: {
		name: 'Skipped',
		title: 'Inactive (skipped)',
		action: 'Ignore card',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Ignoring card',
		failed: 'There was an error updating this card',
		Icon: BookmarkX,
		iconClassName: '',
	},
	nocard: {
		name: 'Not in deck',
		title: 'Not in your deck',
		action: 'Add to deck',
		actionSecond: 'This will add the card to your deck with status "active"',
		done: 'Card removed',
		failed: 'There was an error adding this card to your deck',
		Icon: BookmarkPlus,
		iconClassName: 'opacity-50',
	},
	nodeck: {
		name: 'Start deck',
		title: 'Not learning language',
		action: 'Start new language',
		actionSecond: 'Create a new deck to learn this language',
		done: 'Deck archived',
		failed: 'There was an error updating this deck',
		Icon: PlusCircle,
		iconClassName: '',
	},
}

function StatusIcon({ choice }: { choice: ShowableActions }) {
	const { Icon, iconClassName } = statusStrings[choice]
	return <Icon className={iconClassName} aria-hidden="true" />
}

function StatusSpan({ choice }: { choice: ShowableActions }) {
	return (
		<div className="flex flex-row items-center gap-2 py-1 pe-2">
			<span className="h-5 w-5">
				<StatusIcon choice={choice} />
			</span>
			<div>
				<p className="font-bold">{statusStrings[choice].action}</p>
				<p className="text-opacity-80 text-sm">
					{statusStrings[choice].actionSecond}
				</p>
			</div>
		</div>
	)
}

const isLearnerStatus = (s: LearningStatus | undefined) =>
	s === 'active' || s === 'learned' ? 1 : 0

// count_learners is server-derived (aggregated in the phrase_full view from
// user_card status), so phrasesCollection has no direct mutation handler for
// it — we apply the predicted delta optimistically via writeUpdate and revert
// it manually if the card transaction rolls back.
function updatePhraseCount(
	phraseId: string,
	oldStatus: LearningStatus | undefined,
	newStatus: LearningStatus
): (() => void) | undefined {
	if (oldStatus === newStatus) return
	const previous = phrasesCollection.get(phraseId)
	if (!previous) {
		console.error(`updatePhraseCount: no phrase ${phraseId} in collection`)
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

function useCardStatusMutator(
	phrase: AnyPhrase,
	card: CardWithSibling | undefined
) {
	const userId = useUserId()

	return (status: LearningStatus) => {
		if (!userId) return
		if (card?.status === status) return

		const tx = card
			? cardsCollection.update(
					card.sibling_id ? [card.id, card.sibling_id] : [card.id],
					(drafts) => {
						drafts.forEach((d) => {
							d.status = status
						})
					}
				)
			: (() => {
					const nowIso = new Date().toISOString()
					return cardsCollection.insert(
						directionsForPhrase(phrase.only_reverse).map((direction) => ({
							id: crypto.randomUUID(),
							uid: userId,
							phrase_id: phrase.id,
							lang: phrase.lang,
							status,
							direction,
							created_at: nowIso,
							updated_at: nowIso,
							last_reviewed_at: null,
							difficulty: null,
							stability: null,
						}))
					)
				})()

		const revertCount = updatePhraseCount(phrase.id, card?.status, status)

		tx.isPersisted.promise.then(
			() => {
				// Verify (in test mode) that the DB-side state matches what we
				// asked for — both directions of the phrase share the new status.
				// Stripped in production by vite-plugin-scenetest.
				serverCheck(
					'card status persists to all sibling cards',
					async (server, { uid, phraseId, expectedStatus }) => {
						const { data: rows, error } = await server.supabase
							.from('user_card')
							.select('id, direction, status')
							.eq('uid', uid)
							.eq('phrase_id', phraseId)
						if (error || !rows) {
							failed('fetch user_card after status mutation', {
								error: error?.message,
							})
							return
						}
						should('at least one card row exists', rows.length >= 1, { rows })
						should(
							'all sibling cards share the expected status',
							rows.every((r) => r.status === expectedStatus),
							{ rows, expected: expectedStatus }
						)
					},
					() => ({ uid: userId, phraseId: phrase.id, expectedStatus: status })
				)
				toastSuccess(
					card
						? `Updated card status to "${status}"`
						: 'Added this phrase to your deck'
				)
			},
			(err) => {
				revertCount?.()
				toastError(
					card
						? 'There was an error updating this card'
						: 'There was an error adding this card to your deck'
				)
				console.error('Card status mutation rolled back:', err)
			}
		)
	}
}

export function CardStatusDropdown({
	phrase,
	className,
}: CardStatusDropdownProps) {
	const userId = useUserId()
	const { data: decks } = useDecks()
	const deckPresent = decks?.some((d) => d.lang === phrase.lang) ?? false
	const { data: card } = useMyCard(phrase.id)

	const setCardStatus = useCardStatusMutator(phrase, card)

	const choice = !deckPresent ? 'nodeck' : !card ? 'nocard' : card.status

	return !userId ? null : (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={className}
				render={
					<Button
						variant={card?.status === 'active' ? 'soft' : 'ghost'}
						size="sm"
						className="m-0 min-w-28 justify-between px-1.5"
						data-name="card-status-dropdown"
						data-key={phrase.id}
					/>
				}
			>
				<span className="flex items-center justify-center [&_svg]:size-4">
					<StatusIcon choice={choice} />
				</span>
				<span className="me-1">{statusStrings[choice].name}</span>
				<ChevronDown size={12} />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="">
				{!deckPresent ? (
					<DropdownMenuItem
						render={
							<Link to="/learn/add-deck" search={{ lang: phrase.lang }} />
						}
					>
						<StatusSpan choice="nodeck" />
					</DropdownMenuItem>
				) : !card ? (
					<DropdownMenuItem
						onClick={() => setCardStatus('active')}
						data-testid="add-to-deck-option"
					>
						<StatusSpan choice="nocard" />
					</DropdownMenuItem>
				) : (
					<>
						<DropdownMenuItem
							onClick={() => setCardStatus('active')}
							className={card.status === 'active' ? 'bg-2-mid-primary' : ''}
							data-testid="activate-card-option"
						>
							<StatusSpan choice="active" />
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setCardStatus('learned')}
							className={card.status === 'learned' ? 'bg-2-mid-primary' : ''}
							data-testid="set-learned-option"
						>
							<StatusSpan choice="learned" />
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setCardStatus('skipped')}
							className={card.status === 'skipped' ? 'bg-2-mid-primary' : ''}
							data-testid="ignore-card-option"
						>
							<StatusSpan choice="skipped" />
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

export function CardStatusHeart({
	phrase,
}: {
	phrase: PhraseFullFilteredType | PhraseFullFullType
}) {
	const requireAuth = useRequireAuth()
	const { data: card } = useMyCard(phrase.id)
	const setCardStatus = useCardStatusMutator(phrase, card)
	const statusToPost = card?.status === 'active' ? 'skipped' : 'active'
	return (
		<Button
			variant={card?.status === 'active' ? 'soft' : 'ghost'}
			size="icon"
			data-name="card-status-heart"
			data-key={phrase.id}
			onClick={(e) => {
				e.preventDefault()
				e.stopPropagation()
				requireAuth(
					() => setCardStatus(statusToPost),
					'Please log in to add phrases to your library'
				)
			}}
			aria-label={
				card?.status === 'active'
					? 'Skip this phrase (remove it from your active deck)'
					: 'Learn this phrase (add to your active deck)'
			}
		>
			<Bookmark
				className={
					card?.status === 'active'
						? 'text-primary fill-current/50'
						: 'text-muted-foreground'
				}
			/>
		</Button>
	)
}
