import { Link, useNavigate } from '@tanstack/react-router'
import { ListPlus, MessageSquarePlus, BookOpen, Users } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'

type FilterType = 'request' | 'playlist' | 'phrase'

const filterLabels: Record<FilterType, string> = {
	request: 'requests',
	playlist: 'playlists',
	phrase: 'new phrases',
}

export function FeedEmptyState({
	filterType,
	feedTab,
	lang,
}: {
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

	// Filtered to a specific type but nothing matches
	if (filterType) {
		const action = getFilterAction(filterType)
		const Icon = action.icon

		return (
			<div className="text-muted-foreground my-6 ms-2 space-y-3">
				<p className="italic">
					No {filterLabels[filterType]} in this feed yet.
				</p>
				<p className="text-sm">
					<button onClick={clearFilters} className="s-link cursor-pointer">
						Clear filters
					</button>{' '}
					to see all activity.
				</p>
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
