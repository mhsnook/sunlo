import { Check, Filter } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useIsMobile } from '@/hooks/use-mobile'

type FilterType = 'request' | 'playlist' | 'phrase'

export function FeedFilterMenu() {
	const navigate = useNavigate()
	const search = useSearch({ strict: false })
	const filterType = search.filter_type as FilterType | undefined
	const activeValue = filterType ?? 'all'
	const isMobile = useIsMobile()

	const setFilter = (value: string) => {
		void navigate({
			search: ((prev: Record<string, unknown>) => ({
				...prev,
				filter_type: value === 'all' ? undefined : value,
			})) as never,
		})
	}

	if (!isMobile) {
		return (
			<Tabs
				value={activeValue}
				onValueChange={setFilter}
				data-testid="feed-filter-menu"
			>
				<TabsList>
					<TabsTrigger value="all" data-testid="feed-filter-all">
						All
					</TabsTrigger>
					<TabsTrigger value="request" data-testid="feed-filter-request">
						Requests
					</TabsTrigger>
					<TabsTrigger value="playlist" data-testid="feed-filter-playlist">
						Playlists
					</TabsTrigger>
					<TabsTrigger value="phrase" data-testid="feed-filter-phrase">
						New Phrases
					</TabsTrigger>
				</TabsList>
			</Tabs>
		)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Filter feed content"
					data-testid="feed-filter-button"
				>
					<Filter className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuLabel>Show content type</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{(
					[
						['all', 'All items'],
						['request', 'Requests'],
						['playlist', 'Playlists'],
						['phrase', 'New Phrases'],
					] as const
				).map(([value, label]) => (
					<DropdownMenuItem key={value} onClick={() => setFilter(value)}>
						<Check
							className={
								activeValue === value ? 'opacity-100' : 'opacity-0'
							}
						/>
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
