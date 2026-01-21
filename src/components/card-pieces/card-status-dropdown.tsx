import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { toastError } from '@/components/ui/error-toast'
import {
	Bookmark,
	BookmarkCheck,
	BookmarkPlus,
	BookmarkX,
	CheckCircle,
	ChevronDown,
	PlusCircle,
} from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { PostgrestError } from '@supabase/supabase-js'
import { useRequireAuth } from '@/hooks/use-require-auth'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserId } from '@/lib/use-auth'
import { useDecks } from '@/hooks/use-deck'
import { Button } from '@/components/ui/button'
import { cardsCollection, phrasesCollection } from '@/lib/collections'
import {
	CardMetaSchema,
	CardMetaType,
	PhraseFullFilteredType,
	PhraseFullFullType,
} from '@/lib/schemas'
import { Tables } from '@/types/supabase'

type AnyPhrase = PhraseFullFilteredType | PhraseFullFullType
interface CardStatusDropdownProps {
	phrase: AnyPhrase
	className?: string
}

// TODO check if we can get this from the supabase types?
type LearningStatus = 'active' | 'skipped' | 'learned'
type ShowableActions = LearningStatus | 'nodeck' | 'nocard'

const statusStrings = {
	active: {
		short: 'Active',
		long: 'Card is in your deck',
		action: 'Activate card',
		actionSecond: 'Add it to your active learning deck',
		done: 'Card added',
		icon: () => (
			<Bookmark
				className="fill-purple-600/50 text-purple-600"
				aria-label="Active"
			/>
		),
	},
	learned: {
		short: 'Learned',
		long: 'Inactive (learned)',
		action: 'Set "learned"',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Marked "learned"',
		icon: () => (
			<BookmarkCheck className="text-green-600" aria-label="Learned" />
		),
	},
	skipped: {
		short: 'Skipped',
		long: 'Inactive (skipped)',
		action: 'Ignore card',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Ignoring card',
		icon: () => <BookmarkX aria-label="Skipped" />,
	},
	nocard: {
		short: 'Not in deck',
		long: 'Not in your deck',
		action: 'Add to deck',
		actionSecond: 'This will add the card to your deck with status "active"',
		done: 'Card removed',
		icon: () => <BookmarkPlus className="opacity-50" aria-label="Add card" />,
	},
	nodeck: {
		short: 'Start deck',
		long: 'Not learning language',
		action: 'Start new language',
		actionSecond: 'Create a new deck to learn this language',
		done: 'Deck archived',
		icon: () => <PlusCircle aria-label="Start learning" />,
	},
}

function StatusSpan({ choice }: { choice: ShowableActions }) {
	return (
		<div className="flex flex-row items-center gap-2 py-1 pe-2">
			<span className="h-5 w-5">{statusStrings[choice].icon()}</span>
			<div>
				<p className="font-bold">{statusStrings[choice].action}</p>
				<p className="text-opacity-80 text-sm">
					{statusStrings[choice].actionSecond}
				</p>
			</div>
		</div>
	)
}

function updatePhraseCounts(
	oldCard: CardMetaType | undefined,
	newCard: Tables<'user_card'> // cards never get deleted, just marked inactive
) {
	// if no change in status, nothing to update
	if (oldCard?.status === newCard?.status) return
	const oldPhrase = phrasesCollection.get(newCard.phrase_id)
	// if we can't find the phrase, that's weird
	if (!oldPhrase) {
		console.error(
			`Odd that we have a new card but can't find the phrase for id "${newCard.phrase_id}"`
		)
		return
	}
	phrasesCollection.utils.writeUpdate({
		id: oldPhrase.id,
		count_learners: Math.max(
			(oldPhrase?.count_learners ?? 0) -
				(oldCard?.status === 'active' || oldCard?.status === 'learned' ?
					1
				:	0) +
				(newCard.status === 'active' || newCard.status === 'learned' ? 1 : 0),
			0
		),
	})
}

function useCardStatusMutation(phrase: AnyPhrase) {
	const userId = useUserId()

	return useMutation<
		Tables<'user_card'>,
		PostgrestError,
		{ status: LearningStatus }
	>({
		mutationKey: ['upsert-card', phrase.id],
		mutationFn: async ({ status }: { status: LearningStatus }) => {
			if (!phrase)
				throw new Error('Trying to change status of a card that does not exist')
			if (!userId)
				throw new Error("Trying to change card status but you're not logged in")
			const { data } =
				phrase.card ?
					await supabase
						.from('user_card')
						.update({
							status,
						})
						.eq('phrase_id', phrase.id)
						.eq('uid', userId)
						.select()
						.throwOnError()
				:	await supabase
						.from('user_card')
						.insert({
							lang: phrase.lang,
							phrase_id: phrase.id,
							status,
						})
						.select()
						.throwOnError()
			return data[0]
		},
		onSuccess: (data, variables) => {
			if (data) updatePhraseCounts(phrase.card, data)

			if (phrase.card) {
				cardsCollection.utils.writeUpdate({
					phrase_id: phrase.id,
					status: variables.status,
				})
				toast.success(`Updated card status to "${data.status}"`)
			} else {
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(data))
				toast.success('Added this phrase to your deck')
			}
		},
		onError: (error) => {
			if (phrase.card) toastError('There was an error updating this card')
			else toastError('There was an error adding this card to your deck')
			console.log(`error upserting card`, error)
		},
	})
}

export function CardStatusDropdown({
	phrase,
	className,
}: CardStatusDropdownProps) {
	const userId = useUserId()
	const { data: decks } = useDecks()
	const deckPresent = decks?.some((d) => d.lang === phrase.lang) ?? false
	const card = phrase.card

	const cardMutation = useCardStatusMutation(phrase)

	const choice =
		!deckPresent ? 'nodeck'
		: !card ? 'nocard'
		: card.status

	// @TODO: if no userId, maybe we should prompt to sign up
	return !userId ? null : (
			<DropdownMenu>
				<DropdownMenuTrigger className={className} asChild>
					<Button
						variant="secondary"
						size="sm"
						className="m-0 min-w-28 justify-between px-1.5"
					>
						<span className="flex items-center justify-center [&_svg]:size-4">
							{cardMutation.isSuccess ?
								<CheckCircle className="text-green-500" />
							:	statusStrings[choice].icon()}{' '}
						</span>
						<span className="me-1">{statusStrings[choice].short}</span>
						<ChevronDown size={12} />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="">
					{!deckPresent ?
						<DropdownMenuItem>
							<Link to="/learn/add-deck" search={{ lang: phrase.lang }}>
								<StatusSpan choice="nodeck" />
							</Link>
						</DropdownMenuItem>
					: !card ?
						<DropdownMenuItem
							onClick={() => cardMutation.mutate({ status: 'active' })}
						>
							<StatusSpan choice="nocard" />
						</DropdownMenuItem>
					:	<>
							<DropdownMenuItem
								onClick={() =>
									card?.status === 'active' ?
										false
									:	cardMutation.mutate({ status: 'active' })
								}
								className={card?.status === 'active' ? 'bg-primary/30' : ''}
							>
								<StatusSpan choice="active" />
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									card?.status === 'learned' ?
										false
									:	cardMutation.mutate({ status: 'learned' })
								}
								className={card?.status === 'learned' ? 'bg-primary/30' : ''}
							>
								<StatusSpan choice="learned" />
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() =>
									card?.status === 'skipped' ?
										false
									:	cardMutation.mutate({ status: 'skipped' })
								}
								className={card?.status === 'skipped' ? 'bg-primary/30' : ''}
							>
								<StatusSpan choice="skipped" />
							</DropdownMenuItem>
						</>
					}
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
	const mutation = useCardStatusMutation(phrase)
	const statusToPost = phrase.card?.status === 'active' ? 'skipped' : 'active'
	return (
		<Button
			variant={phrase.card?.status === 'active' ? 'outline-primary' : 'ghost'}
			size="icon"
			onClick={() =>
				requireAuth(
					() => mutation.mutate({ status: statusToPost }),
					'Please log in to add phrases to your library'
				)
			}
			title={
				phrase.card?.status === 'active' ?
					'Skip this phrase (remove it from your active deck)'
				:	'Learn this phrase (add to your active deck)'
			}
		>
			<Bookmark
				className={
					phrase.card?.status === 'active' ?
						'fill-purple-600/50 text-purple-600'
					:	'text-muted-foreground'
				}
			/>
		</Button>
	)
}
