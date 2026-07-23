import { useState } from 'react'
import { failed } from '@scenetest/checks/react'
import { toastError, toastSuccess } from '@/components/ui/sonner'
import {
	ArchiveRestore,
	Bookmark,
	BookmarkCheck,
	BookmarkPlus,
	BookmarkX,
	ChevronDown,
	PlusCircle,
	Sparkles,
} from 'lucide-react'

import { useRequireAuth } from '@/hooks/use-require-auth'
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserId } from '@/lib/use-auth'
import {
	useDeckMeta,
	useMyCard,
	type CardWithSibling,
} from '@/features/deck/hooks'
import languages from '@/lib/languages'
import { Button } from '@/components/ui/button'
import { cardsCollection, decksCollection } from '@/features/deck/collections'
import { directionsForPhrase } from '@/features/deck/card-directions'
import {
	updateCardsStatus,
	updatePhraseLearnerCount,
	type LearningStatus,
} from '@/features/deck/card-status'
import { optimisticNewDeck } from '@/features/deck/mutations'
import { type DeckMetaType } from '@/features/deck/schemas'
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

// Trigger dot colour by card state. The dropdown menu items still use the
// full icon family in `statusStrings`; the trigger is intentionally flat —
// one shape, one size, just hue swapping with the state.
const triggerDotClass: Record<ShowableActions, string> = {
	active: 'bg-primary',
	learned: 'bg-lc-5 bg-chroma-hi bg-hue-success',
	skipped: 'bg-lc-4 bg-chroma-lo bg-hue-neutral',
	nocard: 'bg-lc-3 bg-chroma-lo bg-hue-neutral',
	nodeck: 'bg-lc-3 bg-chroma-lo bg-hue-neutral',
}

function useCardStatusMutator(
	phrase: AnyPhrase,
	card: CardWithSibling | undefined
) {
	const userId = useUserId()

	return (
		status: LearningStatus,
		options?: { silent?: boolean }
	): Promise<void> => {
		if (!userId) return Promise.resolve()
		if (card?.status === status) return Promise.resolve()

		const tx = card
			? updateCardsStatus(
					card.sibling_id ? [card.id, card.sibling_id] : [card.id],
					phrase.id,
					card.status,
					status
				)
			: (() => {
					const nowIso = new Date().toISOString()
					const insertTx = cardsCollection.insert(
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
					const revertCount = updatePhraseLearnerCount(
						phrase.id,
						undefined,
						status
					)
					if (revertCount)
						insertTx.isPersisted.promise.then(undefined, revertCount)
					return insertTx
				})()

		return tx.isPersisted.promise.then(
			() => {
				if (!options?.silent) {
					toastSuccess(
						card
							? `Updated card status to "${status}"`
							: 'Added this phrase to your deck'
					)
				}
			},
			(err) => {
				console.error('Card status mutation rolled back:', err)
				if (options?.silent) throw err
				toastError(
					card
						? 'There was an error updating this card'
						: 'There was an error adding this card to your deck'
				)
			}
		)
	}
}

export function CardStatusDropdown({
	phrase,
	className,
}: CardStatusDropdownProps) {
	const userId = useUserId()
	const { data: deck } = useDeckMeta(phrase.lang)
	const { data: card } = useMyCard(phrase.id)

	const setCardStatus = useCardStatusMutator(phrase, card)

	// Same FK / archived gate as CardStatusHeart — route through the dialog
	// when there's no deck or the deck is archived, regardless of which
	// status the user picked from the menu.
	const needsDeckSetup = !deck || deck.archived
	const [pendingStatus, setPendingStatus] = useState<LearningStatus | null>(
		null
	)

	const pickStatus = (status: LearningStatus) => {
		if (needsDeckSetup) {
			setPendingStatus(status)
		} else {
			void setCardStatus(status)
		}
	}

	// Dropdown items still show the full action context (incl. nodeck copy);
	// the trigger only narrates the card's actual state — flat and consistent,
	// regardless of whether the underlying deck needs setup.
	const menuChoice: ShowableActions = needsDeckSetup
		? 'nodeck'
		: !card
			? 'nocard'
			: card.status
	const triggerChoice: ShowableActions = !card ? 'nocard' : card.status

	return !userId ? null : (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger
					className={className}
					render={
						<Button
							variant={card?.status === 'active' ? 'soft' : 'ghost'}
							size="sm"
							data-name="card-status-dropdown"
							data-key={phrase.id}
							aria-label={`Card status: ${statusStrings[triggerChoice].name}`}
						/>
					}
				>
					<span
						aria-hidden="true"
						className={`size-2 shrink-0 rounded-full ${triggerDotClass[triggerChoice]}`}
					/>
					<span>{statusStrings[triggerChoice].name}</span>
					<ChevronDown className="opacity-60" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="">
					{!card ? (
						<DropdownMenuItem
							onClick={() => pickStatus('active')}
							data-testid="add-to-deck-option"
						>
							<StatusSpan choice={menuChoice} />
						</DropdownMenuItem>
					) : (
						<>
							<DropdownMenuItem
								onClick={() => pickStatus('active')}
								className={
									card.status === 'active'
										? 'bg-lc-0 bg-chroma-mid bg-hue-primary'
										: ''
								}
								data-testid="activate-card-option"
							>
								<StatusSpan choice="active" />
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => pickStatus('learned')}
								className={
									card.status === 'learned'
										? 'bg-lc-0 bg-chroma-mid bg-hue-primary'
										: ''
								}
								data-testid="set-learned-option"
							>
								<StatusSpan choice="learned" />
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => pickStatus('skipped')}
								className={
									card.status === 'skipped'
										? 'bg-lc-0 bg-chroma-mid bg-hue-primary'
										: ''
								}
								data-testid="ignore-card-option"
							>
								<StatusSpan choice="skipped" />
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{needsDeckSetup && (
				<StartLearningDialog
					open={pendingStatus !== null}
					onOpenChange={(o) => {
						if (!o) setPendingStatus(null)
					}}
					lang={phrase.lang}
					archivedDeck={deck?.archived ? deck : null}
					onConfirmed={() =>
						pendingStatus
							? setCardStatus(pendingStatus, { silent: true })
							: Promise.resolve()
					}
				/>
			)}
		</>
	)
}

export function CardStatusHeart({
	phrase,
}: {
	phrase: PhraseFullFilteredType | PhraseFullFullType
}) {
	const requireAuth = useRequireAuth()
	const { data: card } = useMyCard(phrase.id)
	const { data: deck } = useDeckMeta(phrase.lang)
	const setCardStatus = useCardStatusMutator(phrase, card)
	const statusToPost = card?.status === 'active' ? 'skipped' : 'active'

	// FK constraint: user_card(uid, lang) → user_deck(uid, lang). No deck row
	// would throw. An archived deck would technically satisfy the FK, but the
	// card would land in a deck the user can't see — also wrong UX. Both cases
	// route through the dialog.
	const needsDeckSetup = !deck || deck.archived
	const [dialogOpen, setDialogOpen] = useState(false)

	return (
		<>
			<Button
				variant={card?.status === 'active' ? 'soft' : 'ghost'}
				size="icon"
				data-name="card-status-heart"
				data-key={phrase.id}
				onClick={(e) => {
					e.preventDefault()
					e.stopPropagation()
					requireAuth(() => {
						if (needsDeckSetup) {
							setDialogOpen(true)
						} else {
							void setCardStatus(statusToPost)
						}
					}, 'Please log in to add phrases to your library')
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
			{needsDeckSetup && (
				<StartLearningDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					lang={phrase.lang}
					archivedDeck={deck?.archived ? deck : null}
					onConfirmed={() => setCardStatus(statusToPost, { silent: true })}
				/>
			)}
		</>
	)
}

/**
 * Yes/no dialog shown when the user taps the bookmark on a phrase whose
 * language they aren't actively learning. Creates the deck (or unarchives an
 * existing one) and then runs `onConfirmed` to add the card.
 */
function StartLearningDialog({
	open,
	onOpenChange,
	lang,
	archivedDeck,
	onConfirmed,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	lang: string
	archivedDeck: DeckMetaType | null
	onConfirmed: () => Promise<void>
}) {
	const userId = useUserId()
	const [pending, setPending] = useState(false)
	const language = languages[lang] ?? lang
	const isUnarchive = !!archivedDeck

	const handleConfirm = async () => {
		setPending(true)
		let deckReady = false
		try {
			if (!userId) {
				// The dropdown/heart render null when logged out, so reaching this
				// dialog without a user is a broken invariant.
				failed('StartLearningDialog confirmed without a logged-in user', {
					lang,
				})
				throw new Error('Please log in to start a deck')
			}
			if (isUnarchive) {
				const tx = decksCollection.update(lang, (draft) => {
					draft.archived = false
				})
				await tx.isPersisted.promise
			} else {
				// FK: user_card(uid, lang) → user_deck(uid, lang), so the deck must
				// be persisted before onConfirmed() inserts the card.
				const tx = decksCollection.insert(optimisticNewDeck(lang, userId))
				await tx.isPersisted.promise
			}
			deckReady = true
			await onConfirmed()
			toastSuccess(
				isUnarchive
					? `Restored your ${language} deck and added this phrase`
					: `Started a new ${language} deck with this phrase`
			)
			onOpenChange(false)
		} catch (err) {
			console.error('StartLearningDialog: failed', err)
			toastError(
				deckReady
					? `Created your ${language} deck but couldn't add this phrase`
					: isUnarchive
						? `Couldn't restore your ${language} deck`
						: `Couldn't start a new ${language} deck`
			)
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-testid="start-learning-dialog"
				data-key={lang}
				data-mode={isUnarchive ? 'unarchive' : 'create'}
				className="max-w-md"
			>
				<DialogHeader>
					<DialogTitle>
						{isUnarchive
							? `Restore your ${language} deck?`
							: `Start learning ${language}?`}
					</DialogTitle>
					<DialogDescription>
						{isUnarchive
							? `You have an archived ${language} deck. Restore it and add this phrase to start learning again.`
							: `You aren't learning ${language} yet. Start a new deck and add this phrase?`}
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
					<button
						type="button"
						onClick={() => void handleConfirm()}
						disabled={pending}
						data-testid="confirm-start-learning-button"
						className="from-lc-5 from-chroma-mhi from-hue-primary to-lc-6 to-chroma-mid to-hue-primary text-primary-foreground hover:from-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl bg-gradient-to-br p-4 text-start shadow transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
					>
						{isUnarchive ? (
							<ArchiveRestore className="size-6" />
						) : (
							<Sparkles className="size-6" />
						)}
						<div>
							<div className="text-base leading-tight font-semibold">
								{pending
									? isUnarchive
										? 'Restoring…'
										: 'Starting…'
									: isUnarchive
										? 'Yes, restore and add'
										: 'Yes, start and add'}
							</div>
							<div className="text-primary-foreground/80 text-xs">
								{isUnarchive
									? 'Reactivate your deck and bookmark this phrase'
									: `Create your ${language} deck and bookmark this phrase`}
							</div>
						</div>
					</button>

					<DialogClose
						data-testid="cancel-start-learning-button"
						className="border-lc-2 border-chroma-lo border-hue-neutral bg-lc-1 bg-chroma-mlo bg-hue-neutral text-lc-7 text-chroma-mid text-hue-neutral hover:bg-lc-down-1 hover:text-lc-up-1 flex h-full cursor-pointer flex-col items-start gap-2 rounded-2xl border p-4 text-start shadow transition-transform hover:-translate-y-0.5"
					>
						<Bookmark className="size-6" />
						<div>
							<div className="text-base leading-tight font-semibold">
								No, not now
							</div>
							<div className="text-muted-foreground text-xs">
								Just browsing — leave my decks alone
							</div>
						</div>
					</DialogClose>
				</div>
			</DialogContent>
		</Dialog>
	)
}
