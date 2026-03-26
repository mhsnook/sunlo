import { Link, useNavigate } from '@tanstack/react-router'
import { ListPlus, MessageSquarePlus, BookOpen, Users } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import type { FeedActivityType } from '@/features/feed/schemas'

type FilterType = 'request' | 'playlist' | 'phrase'

const filterLabels: Record<FilterType, string> = {
	request: 'requests',
	playlist: 'playlists',
	phrase: 'new phrases',
}

export function FeedEmptyState({
	feedItems,
	filterType,
	feedTab,
	lang,
}: {
	feedItems: Array<FeedActivityType> | undefined
	filterType: FilterType | undefined
	feedTab: 'newest' | 'friends' | 'popular'
	lang: string
}) {
	const navigate = useNavigate()

	const clearFilters = () => {
		void navigate({
			search: ((prev: Record<string, unknown>) => ({
				...prev,
				filter_type: undefined,
			})) as never,
		})
	}

	// Count items by type from the unfiltered feed
	const typeCounts: Record<FilterType, number> = {
		request: 0,
		playlist: 0,
		phrase: 0,
	}
	for (const item of feedItems ?? []) {
		typeCounts[item.type as FilterType]++
	}
	const totalItems = (feedItems ?? []).length

	// Filtered to a specific type but nothing matches, while other types exist
	if (filterType && totalItems > 0) {
		const otherTypes = (Object.keys(typeCounts) as Array<FilterType>).filter(
			(t) => t !== filterType && typeCounts[t] > 0
		)

		const action = getFilterAction(filterType)
		const Icon = action.icon

		return (
			<div className="text-muted-foreground my-6 ms-2 space-y-3">
				<p className="italic">
					No {filterLabels[filterType]} in this feed yet.
				</p>
				{otherTypes.length > 0 && (
					<p className="text-sm">
						There{' '}
						{otherTypes.length === 1 ?
							`are ${typeCounts[otherTypes[0]]} ${filterLabels[otherTypes[0]]}`
						:	otherTypes
								.map((t) => `${typeCounts[t]} ${filterLabels[t]}`)
								.join(' and ')
						}{' '}
						to see though!{' '}
						<button onClick={clearFilters} className="s-link cursor-pointer">
							Clear filters
						</button>
					</p>
				)}
				<div className="mt-4">
					<Link
						className={buttonVariants({ variant: 'soft', size: 'sm' })}
						to={action.to}
						params={{ lang }}
					>
						<Icon className="size-4" />
						{action.label}
					</Link>
				</div>
			</div>
		)
	}

	// Completely empty feed
	if (feedTab === 'friends') {
		return (
			<div className="text-muted-foreground my-6 ms-2 space-y-3">
				<p className="italic">
					<Users className="me-1.5 mb-0.5 inline size-4" />
					Nothing from friends yet. Maybe you need to add some?
				</p>
				<div className="flex flex-wrap gap-2">
					<Link
						className={buttonVariants({ variant: 'soft', size: 'sm' })}
						to="/friends"
					>
						Find friends
					</Link>
					<Link
						className={buttonVariants({ variant: 'soft', size: 'sm' })}
						to="/learn/$lang/requests/new"
						params={{ lang }}
					>
						Post a request
					</Link>
				</div>
			</div>
		)
	}

	return (
		<div className="text-muted-foreground my-6 ms-2 space-y-3">
			<p className="italic">
				{feedTab === 'popular' ?
					'Nothing popular yet. You might have to lead the way!'
				:	'This feed is empty.'}
			</p>
			<Link
				className={buttonVariants({ variant: 'soft', size: 'sm' })}
				to="/learn/$lang/requests/new"
				params={{ lang }}
			>
				<MessageSquarePlus className="size-4" />
				Post a request for a new phrase
			</Link>
		</div>
	)
}

function getFilterAction(filterType: FilterType) {
	const actions: Record<
		FilterType,
		{ label: string; to: string; icon: typeof ListPlus }
	> = {
		playlist: {
			label: 'Create a playlist',
			to: '/learn/$lang/playlists/new',
			icon: ListPlus,
		},
		request: {
			label: 'Post a request',
			to: '/learn/$lang/requests/new',
			icon: MessageSquarePlus,
		},
		phrase: {
			label: 'Add a phrase',
			to: '/learn/$lang/phrases/new',
			icon: BookOpen,
		},
	}
	return actions[filterType]
}
