import supabase from '@/lib/supabase-client'
import { CardRow, uuid } from '@/types/main'
import { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle, CircleMinus, Plus, Sparkles, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'
import { useProfile } from '@/lib/use-profile'
import { useDeckCard } from '@/lib/use-deck'
import { buttonVariants } from './ui/button-variants'

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
		short: 'active',
		long: 'Card active',
		action: 'Activate card',
		actionSecond: 'Add it to your active learning deck',
		done: 'Card activated',
		icon: () => <Zap className="size-4 text-yellow-600" aria-label="Active" />,
	},
	learned: {
		short: 'learned',
		long: 'Inactive (learned)',
		action: 'Set "learned"',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Marked "learned"',
		icon: () => (
			<Sparkles className="size-4 text-green-600" aria-label="Learned" />
		),
	},
	skipped: {
		short: 'skipped',
		long: 'Inactive (skipped)',
		action: 'Ignore card',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Ignoring card',
		icon: () => (
			<CircleMinus className="size-4 text-gray-600" aria-label="Skipped" />
		),
	},
	nocard: {
		short: 'add',
		long: 'Not in deck',
		action: 'Add to deck',
		actionSecond: 'This will add the card to your deck with status "active"',
		done: 'Card removed',
		icon: () => <Plus className="size-4 text-gray-600" aria-label="Add card" />,
	},
	nodeck: {
		short: '',
		long: 'Not learning language',
		action: 'Add deck',
		actionSecond: 'Create a new deck to learn this phrase and more',
		done: 'Deck archived',
		icon: () => (
			<Plus className="size-4 text-gray-600" aria-label="Start learning" />
		),
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

export function CardStatusDropdown({
	pid,
	lang,
	card,
	deckPresent,
	className,
	button = false,
}: CardStatusDropdownProps) {
	const { userId } = useAuth()
	const queryClient = useQueryClient()
	const { data: profile } = useProfile()
	const deckPresent = profile?.deckLanguages?.includes(lang) ?? false
	const { data: card } = useDeckCard(pid, lang, deckPresent)

	const cardMutation = useMutation<
		CardRow,
		PostgrestError,
		{ status: LearningStatus }
	>({
		mutationKey: ['upsert-card', pid],
		mutationFn: async (variables: { status: LearningStatus }) => {
			const { data } =
				card ?
					await supabase
						.from('user_card')
						.update({
							status: variables.status,
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
							status: variables.status,
						})
						.select()
						.throwOnError()
			return data[0]
		},
		onSuccess: () => {
			if (card) toast.success('Updated card status')
			else toast.success('Added this phrase to your deck')
			void queryClient.invalidateQueries({ queryKey: ['user', lang, 'deck'] })
		},
		onError: () => {
			if (card) toast.error('There was an error updating this card')
			else toast.error('There was an error adding this card to your deck')
		},
	})

	// optimistic update not needed because we invalidate the query
	// const cardPresent = cardMutation.data ?? card
	const choice =
		!deckPresent ? 'nodeck'
		: !card ? 'nocard'
		: card.status!

	// @TODO: if no userId, maybe we should prompt to sign up
	return !userId ? null : (
			<DropdownMenu>
				<DropdownMenuTrigger className={cn('group flex', className)}>
					{button ?
						<span
							className={cn(
								buttonVariants({ variant: 'outline' }),
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
							variant="outline"
							className="group-data-[state=open]:bg-primary m-0 gap-1 group-data-[state=open]:text-white"
						>
							{cardMutation.isSuccess ?
								<CheckCircle className="size-4 text-green-500" />
							:	statusStrings[choice].icon()}{' '}
							{statusStrings[choice].short}
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
