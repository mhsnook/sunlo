import supabase from '@/lib/supabase-client'
import { CardRow, uuid } from '@/types/main'
import { PostgrestError } from '@supabase/supabase-js'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CheckCircle, CircleMinus, Plus, Sparkles, Zap } from 'lucide-react'
import { Badge } from './ui/badge'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

interface CardStatusDropdownProps {
	deckId?: uuid
	pid: uuid
	lang: string
	card?: CardRow
	className?: string
}

// TODO check if we can get this from the supabase types?
type LearningStatus = 'active' | 'skipped' | 'learned'
type ShowableActions = LearningStatus | 'nodeck' | 'nocard'

const statusStrings = {
	active: {
		short: 'active',
		action: 'Activate card',
		actionSecond: 'Add it to your active learning deck',
		done: 'Card activated',
		icon: () => <Zap className="size-4 text-yellow-500" aria-label="Active" />,
	},
	learned: {
		short: 'learned',
		action: 'Set "learned"',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Marked "&ldquo;"learned"',
		icon: () => (
			<Sparkles className="size-4 text-green-500" aria-label="Learned" />
		),
	},
	skipped: {
		short: 'skipped',
		action: 'Ignore card',
		actionSecond: 'This will remove the card from your daily rotation',
		done: 'Ignoring card',
		icon: () => (
			<CircleMinus className="size-4 text-gray-500" aria-label="Skipped" />
		),
	},
	nocard: {
		short: 'add',
		action: 'Add to deck',
		actionSecond: 'This will add the card to your deck with status "active"',
		done: 'Card removed',
		icon: () => <Plus className="size-4 text-gray-500" aria-label="Add card" />,
	},
	nodeck: {
		short: '...',
		action: 'Add deck',
		actionSecond: 'Create a new deck to learn this phrase and more',
		done: 'Deck archived',
		icon: () => (
			<Plus className="size-4 text-gray-500" aria-label="Start learning" />
		),
	},
}

function StatusSpan({ choice }: { choice: ShowableActions }) {
	return (
		<div className="flex flex-row items-center gap-2 py-1 pe-2">
			{statusStrings[choice].icon()}
			<div>
				<p className="font-bold">{statusStrings[choice].action}</p>
				<p className="text-muted-foreground text-sm">
					{statusStrings[choice].actionSecond}
				</p>
			</div>
		</div>
	)
}

export function CardStatusDropdown({
	deckId,
	pid,
	lang,
	card,
	className,
}: CardStatusDropdownProps) {
	const queryClient = useQueryClient()
	const cardMutation = useMutation<
		CardRow,
		PostgrestError,
		{ status: LearningStatus }
	>({
		mutationKey: ['upsert-card', pid],
		mutationFn: async (variables: { status: LearningStatus }) => {
			if (!deckId || !pid)
				throw new Error('Some required input not provided: deck ID, phrase ID')

			const { data } =
				card?.id ?
					await supabase
						.from('user_card')
						.update({
							status: variables.status,
						})
						.eq('id', card.id)
						.select()
						.throwOnError()
				:	await supabase
						.from('user_card')
						.insert({
							user_deck_id: deckId,
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
			void queryClient.invalidateQueries({ queryKey: ['user', lang] })
		},
		onError: () => {
			if (card) toast.error('There was an error updating this card')
			else toast.error('There was an error adding this card to your deck')
		},
	})

	const cardPresent = cardMutation.data ?? card
	const choice =
		!deckId ? 'nodeck'
		: !cardPresent ? 'nocard'
		: cardPresent.status

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className={cn('group flex rounded-full', className)}>
				<Badge
					variant="outline"
					className="group-data-[state=open]:bg-primary m-0 gap-1 group-data-[state=open]:text-white"
				>
					{cardMutation.isSuccess ?
						<CheckCircle className="size-4 text-green-500" />
					:	statusStrings[choice].icon()}{' '}
					{statusStrings[choice].short}
				</Badge>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="">
				{!deckId ?
					<DropdownMenuItem>
						<Link to="/learn/add-deck">
							<StatusSpan choice="nodeck" />
						</Link>
					</DropdownMenuItem>
				: !cardPresent ?
					<DropdownMenuItem
						onClick={() => cardMutation.mutate({ status: 'active' })}
					>
						<StatusSpan choice="nocard" />
					</DropdownMenuItem>
				:	<>
						<DropdownMenuItem
							disabled={cardPresent?.status === 'active'}
							onClick={() => cardMutation.mutate({ status: 'active' })}
						>
							<StatusSpan choice="active" />
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={cardPresent?.status === 'learned'}
							onClick={() => cardMutation.mutate({ status: 'learned' })}
						>
							<StatusSpan choice="learned" />
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={cardPresent?.status === 'skipped'}
							onClick={() => cardMutation.mutate({ status: 'skipped' })}
						>
							<StatusSpan choice="skipped" />
						</DropdownMenuItem>
					</>
				}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
