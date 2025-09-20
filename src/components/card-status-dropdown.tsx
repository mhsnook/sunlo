import supabase from '@/lib/supabase-client'
import {
	CardRow,
	DeckLoaded,
	OnePhraseComponentProps,
	uuid,
} from '@/types/main'
import { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { useProfile } from '@/hooks/use-profile'
import { useDeckCard } from '@/hooks/use-deck'
import { buttonVariants } from './ui/button-variants'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Button } from './ui/button'

interface CardStatusDropdownProps {
	pid: uuid
	lang: string
	className?: string
	button?: boolean
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

function useCardStatusMutation(pid: uuid, lang: string) {
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const { data: card } = useDeckCard(pid, lang)
	return useMutation<CardRow, PostgrestError, { status: LearningStatus }>({
		mutationKey: ['upsert-card', pid],
		mutationFn: async ({ status }: { status: LearningStatus }) => {
			const { data } =
				card ?
					await supabase
						.from('user_card')
						.update({
							status,
						})
						.eq('phrase_id', pid)
						.eq('uid', userId!)
						.select()
						.throwOnError()
				:	await supabase
						.from('user_card')
						.insert({
							lang,
							phrase_id: pid,
							status,
						})
						.select()
						.throwOnError()
			return data[0]
		},
		onSuccess: (data) => {
			if (card) toast.success('Updated card status')
			else toast.success('Added this phrase to your deck')
			void queryClient.setQueryData(
				['user', lang, 'deck'],
				(oldData: DeckLoaded) => ({
					...oldData,
					cardsMap: {
						...oldData.cardsMap,
						[pid]: { ...data, reviews: oldData.cardsMap[pid]?.reviews ?? [] },
					},
				})
			)
			void queryClient.invalidateQueries({ queryKey: ['user', lang] })
		},
		onError: (error) => {
			if (card) toast.error('There was an error updating this card')
			else toast.error('There was an error adding this card to your deck')
			console.log(`error upserting card`, error)
		},
	})
}

export function CardStatusDropdown({
	pid,
	lang,
	className,
	button = false,
}: CardStatusDropdownProps) {
	const { userId } = useAuth()
	const { data: profile } = useProfile()
	const deckPresent = profile?.deckLanguages?.includes(lang) ?? false
	const { data: card } = useDeckCard(pid, lang)

	const cardMutation = useCardStatusMutation(pid, lang)

	// optimistic update not needed because we invalidate the query
	// const cardPresent = cardMutation.data ?? card
	const choice =
		!deckPresent ? 'nodeck'
		: !card ? 'nocard'
		: card.status!

	// @TODO: if no userId, maybe we should prompt to sign up
	return !userId ? null : (
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn('group flex cursor-pointer', className)}
				>
					{button ?
						<span
							className={cn(
								buttonVariants({ variant: 'secondary' }),
								`group-data-[state=open]:bg-primary m-0 gap-1 group-data-[state=open]:text-white`
							)}
						>
							{cardMutation.isSuccess ?
								<CheckCircle className="size-4 text-green-500" />
							:	statusStrings[choice].icon()}{' '}
							{cardMutation.data ?
								statusStrings[choice].done
							:	statusStrings[choice].long}
						</span>
					:	<Badge
							variant="secondary"
							className={`group-data-[state=open]:bg-primary inset-shadow m-0 gap-1 px-1.5 shadow-sm transition-opacity group-data-[state=open]:text-white hover:opacity-60`}
						>
							{cardMutation.isSuccess ?
								<CheckCircle className="size-4 text-green-500" />
							:	statusStrings[choice].icon()}{' '}
							{statusStrings[choice].short}
							<Separator orientation="vertical" className="ms-1" />
							<ChevronDown size="12" />
						</Badge>
					}
				</DropdownMenuTrigger>
				<DropdownMenuContent className="">
					{!deckPresent ?
						<DropdownMenuItem>
							<Link to="/learn/add-deck" search={{ lang }}>
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

export function CardStatusHeart({ pid, lang }: OnePhraseComponentProps) {
	const mutation = useCardStatusMutation(pid, lang)
	const { data: card } = useDeckCard(pid, lang)
	const status = card?.status === 'active' ? 'skipped' : 'active'

	return (
		<Button
			variant="outline"
			size="icon"
			className={card?.status === 'active' ? 'border-primary-foresoft/30' : ''}
			onClick={() => mutation.mutate({ status })}
		>
			{card?.status === 'active' ?
				<Heart className="fill-red-600 text-red-600" />
			:	<Heart className="text-muted-foreground" />}
		</Button>
	)
}
