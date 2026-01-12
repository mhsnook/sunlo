import { Filter } from 'lucide-react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function FeedFilterMenu() {
	const navigate = useNavigate()
	const search = useSearch({ strict: false })

	// Default all filters to true if not specified
	const filterRequests = search.filter_requests ?? true
	const filterPlaylists = search.filter_playlists ?? true
	const filterPhrases = search.filter_phrases ?? true

	const toggleFilter = (
		filterName: 'filter_requests' | 'filter_playlists' | 'filter_phrases'
	) => {
		const currentValue =
			filterName === 'filter_requests' ? filterRequests
			: filterName === 'filter_playlists' ? filterPlaylists
			: filterPhrases

		void navigate({
			search: (prev: typeof search) => ({
				...prev,
				[filterName]: currentValue ? false : undefined,
			}),
		})
	}

	// Count active filters
	const activeFilterCount = [
		filterRequests,
		filterPlaylists,
		filterPhrases,
	].filter(Boolean).length

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					title="Filter feed content"
					data-testid="feed-filter-button"
				>
					<Filter className="h-4 w-4" />
					{activeFilterCount < 3 && (
						<span className="sr-only">
							{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}{' '}
							active
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Show content types</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem
					checked={filterRequests}
					onCheckedChange={() => toggleFilter('filter_requests')}
				>
					Requests
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={filterPlaylists}
					onCheckedChange={() => toggleFilter('filter_playlists')}
				>
					Playlists
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={filterPhrases}
					onCheckedChange={() => toggleFilter('filter_phrases')}
				>
					New Phrases
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
