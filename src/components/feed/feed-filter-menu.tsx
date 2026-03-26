import { Check, ListFilter } from 'lucide-react'
import { useNavigate, useSearch } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type FilterType = 'request' | 'playlist' | 'phrase'

const filterOptions = [
	['all', 'All types'],
	['request', 'Requests'],
	['playlist', 'Playlists'],
	['phrase', 'New Phrases'],
] as const

export function FeedFilterMenu() {
	const navigate = useNavigate()
	const search = useSearch({ strict: false })
	const filterType = search.filter_type as FilterType | undefined
	const activeValue = filterType ?? 'all'
	const activeLabel =
		filterOptions.find(([v]) => v === activeValue)?.[1] ?? 'All types'

	const setFilter = (value: string) => {
		void navigate({
			search: ((prev: Record<string, unknown>) => ({
				...prev,
				filter_type: value === 'all' ? undefined : value,
			})) as never,
		})
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					aria-label="Filter feed content"
					data-testid="feed-filter-button"
					className="text-muted-foreground gap-1 text-xs"
				>
					<ListFilter className="size-3.5" />
					{activeLabel}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Show content type</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{filterOptions.map(([value, label]) => (
					<DropdownMenuItem key={value} onClick={() => setFilter(value)}>
						<Check
							className={activeValue === value ? 'opacity-100' : 'opacity-0'}
						/>
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
