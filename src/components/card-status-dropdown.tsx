import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
	CheckCircle,
	ChevronDown,
	CircleMinus,
	Heart,
	PlusCircle,
	Sparkles,
	Zap,
} from 'lucide-react'

import supabase from '@/lib/supabase-client'
import { PostgrestError } from '@supabase/supabase-js'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUserId } from '@/lib/hooks'
import { useDecks } from '@/hooks/use-deck'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cardsCollection } from '@/lib/collections'
import {
	CardMetaSchema,
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
		icon: (size = 16) => (
			<Zap size={size} className="text-yellow-600" aria-label="Active" />
		),
	},
	learned: {
		short: 'Learned',
		long: 'Inactive (learned)',
		action: 'Set "learned"',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Marked "learned"',
		icon: (size = 16) => (
			<Sparkles size={size} className="text-green-600" aria-label="Learned" />
		),
	},
	skipped: {
		short: 'Skipped',
		long: 'Inactive (skipped)',
		action: 'Ignore card',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Ignoring card',
		icon: (size = 16) => <CircleMinus size={size} aria-label="Skipped" />,
	},
	nocard: {
		short: 'Not in deck',
		long: 'Not in your deck',
		action: 'Add to deck',
		actionSecond: 'This will add the card to your deck with status "active"',
		done: 'Card removed',
		icon: (size = 16) => (
			<PlusCircle className="opacity-50" size={size} aria-label="Add card" />
		),
	},
	nodeck: {
		short: 'Start deck',
		long: 'Not learning language',
		action: 'Start new language',
		actionSecond: 'Create a new deck to learn this language',
		done: 'Deck archived',
		icon: (size = 16) => <PlusCircle size={size} aria-label="Start learning" />,
	},
}

function StatusSpan({ choice }: { choice: ShowableActions }) {
	return (
		<div className="flex flex-row items-center gap-2 py-1 pe-2">
			{statusStrings[choice].icon()}
			<div>
				<p className="font-bold">{statusStrings[choice].action}</p>
				<p className="text-opacity-80 text-sm">
					{statusStrings[choice].actionSecond}
				</p>
			</div>
		</div>
	)
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
			if (phrase.card) {
				toast.success('Updated card status')
				cardsCollection.utils.writeUpdate({
					phrase_id: phrase.id,
					status: variables.status,
				})
			} else {
				toast.success('Added this phrase to your deck')
				cardsCollection.utils.writeInsert(CardMetaSchema.parse(data))
			}
		},
		onError: (error) => {
			if (phrase.card) toast.error('There was an error updating this card')
			else toast.error('There was an error adding this card to your deck')
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
	const deckPresent = decks.some((d) => d.lang === phrase.lang) ?? false
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
					<Button variant="secondary" size="sm" className="m-0 gap-1 px-1.5">
						{cardMutation.isSuccess ?
							<CheckCircle className="size-4 text-green-500" />
						:	statusStrings[choice].icon()}{' '}
						{statusStrings[choice].short}
						<Separator
							orientation="vertical"
							className="bg-secondary-foreground/10 ms-1"
						/>
						<ChevronDown size="12" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="">
					{!deckPresent ?
						<DropdownMenuItem>
							<Link
								to="/learn/add-deck"
								// oxlint-disable-next-line jsx-no-new-object-as-prop
								search={{ lang: phrase.lang }}
							>
								<StatusSpan choice="nodeck" />
							</Link>
						</DropdownMenuItem>
					: !card ?
						<DropdownMenuItem
							// oxlint-disable-next-line jsx-no-new-function-as-prop
							onClick={() => cardMutation.mutate({ status: 'active' })}
						>
							<StatusSpan choice="nocard" />
						</DropdownMenuItem>
					:	<>
							<DropdownMenuItem
								// oxlint-disable-next-line jsx-no-new-function-as-prop
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
								// oxlint-disable-next-line jsx-no-new-function-as-prop
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
								// oxlint-disable-next-line jsx-no-new-function-as-prop
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
	phrase: PhraseFullFilteredType
}) {
	const mutation = useCardStatusMutation(phrase)
	const statusToPost = phrase.card?.status === 'active' ? 'skipped' : 'active'
	return (
		<Button
			variant="outline"
			size="icon"
			className={
				phrase.card?.status === 'active' ? 'border-primary-foresoft/30' : ''
			}
			// oxlint-disable-next-line jsx-no-new-function-as-prop
			onClick={() => mutation.mutate({ status: statusToPost })}
		>
			{phrase.card?.status === 'active' ?
				<Heart className="fill-red-600 text-red-600" />
			:	<Heart className="text-muted-foreground" />}
		</Button>
	)
}
