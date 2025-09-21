import { type FormEvent, useCallback, useState } from 'react'
import { ChevronLeft, MoreVertical, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
	Link,
	RouteMatch,
	useMatches,
	useNavigate,
} from '@tanstack/react-router'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useLinks } from '@/hooks/links'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTrigger,
	DialogTitle,
	DialogDescription,
} from '../ui/dialog'
import { SearchResult } from '@/types/main'
import { Input } from '../ui/input'
import { useMutation } from '@tanstack/react-query'
import { PostgrestError } from '@supabase/supabase-js'

type NavbarLoaderData = {
	titleBar?: {
		title?: string
		subtitle?: string
		onBackClick?: string | (() => void)
	}
	quickSearch: {
		labelText: string
		searchFn: ({ query }: { query: string }) => Promise<SearchResult[]>
	}
	contextMenu?: string[]
}
type NavbarMatch = RouteMatch<
	string,
	string,
	unknown,
	unknown,
	unknown,
	unknown,
	unknown
> & {
	loaderData?: NavbarLoaderData
}

export default function Navbar() {
	const matches = useMatches()
	if (matches.some((match) => match.status === 'pending')) return null

	return (
		<nav className="flex items-center justify-between border-b px-[1cqw] py-3">
			<div className="flex h-12 items-center gap-1.5">
				<SidebarTrigger />
				<Title matches={matches} />
			</div>
			<div className="flex flex-row items-center gap-3">
				<SearchFlyout matches={matches} />
				<ContextMenu matches={matches} />
			</div>
		</nav>
	)
}

function Title({ matches }: { matches: NavbarMatch[] }) {
	const navigate = useNavigate()

	const match = matches.findLast((m) => !!m?.loaderData?.titleBar)
	const titleBar = match?.loaderData?.titleBar

	const goBackOrToStringUrl = useCallback(() => {
		void navigate({
			to:
				typeof titleBar?.onBackClick === 'string' ?
					titleBar?.onBackClick
				:	'..',
		})
	}, [navigate, titleBar?.onBackClick])

	if (!titleBar) return null
	const onBackClickFn =
		typeof titleBar.onBackClick === 'function' ?
			titleBar.onBackClick
		:	goBackOrToStringUrl

	return (
		<div className="ms-1.5 flex flex-row items-center gap-3">
			<Button variant="ghost" size="icon" onClick={onBackClickFn}>
				<ChevronLeft />
				<span className="sr-only">Back</span>
			</Button>

			<div className="flex flex-row items-center gap-[1cqw] rounded-2xl">
				<div>
					<h1 className="text-lg font-bold">{titleBar?.title}</h1>
					<p className="text-sm opacity-80">{titleBar?.subtitle}</p>
				</div>
			</div>
		</div>
	)
}

function ContextMenu({ matches }: { matches: NavbarMatch[] }) {
	const [isOpen, setIsOpen] = useState(false)
	const setClosed = useCallback(() => setIsOpen(false), [setIsOpen])
	const match = matches.findLast((m) => !!m?.loaderData?.contextMenu)
	const links = useLinks(match?.loaderData?.contextMenu)
	if (!links || !links.length) return null

	return (
		<DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon">
					<MoreVertical />
					<span className="sr-only">Open menu</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				{links.map(({ link, name, Icon }) => (
					<DropdownMenuItem key={link.to}>
						<Link
							{...link}
							className="flex w-full flex-row items-center gap-2"
							onClick={setClosed}
						>
							{!Icon ? null : <Icon className="size-[1.25rem]" />}
							{name}
						</Link>
					</DropdownMenuItem>
				)) || (
					<DropdownMenuItem disabled>No options available</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function SearchFlyout({ matches }: { matches: NavbarMatch[] }) {
	const quickSearch = matches.findLast((m) => !!m?.loaderData?.quickSearch)
		?.loaderData?.quickSearch
	if (!quickSearch) return null
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="icon" variant="ghost">
					<Search />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{quickSearch.labelText}</DialogTitle>
					<DialogDescription className="sr-only">
						Use the input below to search
					</DialogDescription>
				</DialogHeader>
				<SearchForm quickSearch={quickSearch} />
			</DialogContent>
		</Dialog>
	)
}

function SearchForm({
	quickSearch,
}: {
	quickSearch: NavbarLoaderData['quickSearch']
}) {
	const searchMutation = useMutation<
		SearchResult[],
		PostgrestError,
		{ query: string }
	>({
		// We use a more specific mutation key to avoid conflicts
		mutationKey: ['quick-search', quickSearch.labelText, 'form-submit'],
		mutationFn: quickSearch.searchFn,
		onSuccess: (data) => console.log(data),
		onError: (error) => console.log(`Error searching`, error),
	})

	const handleSubmit = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			e.stopPropagation()
			const formData = new FormData(e.currentTarget)
			const query = formData.get('quick_search_query') as string
			searchMutation.mutate({ query: query ?? '' })
		},
		[searchMutation]
	)

	return (
		<>
			<form className="flex flex-row items-end gap-2" onSubmit={handleSubmit}>
				<div className="w-full">
					<Input placeholder="Quick search" name="quick_search_query" />
				</div>
				<Button disabled={searchMutation.isPending}>
					<Search />
					<span className="hidden @md:block">Search</span>
				</Button>
			</form>
			<p className="text-muted-foreground text-sm italic">
				{searchMutation.data?.length ?? 0} results
			</p>
			<div className="flex flex-col gap-2">
				{searchMutation.data?.map((result) => (
					<SearchResultListItem
						key={JSON.stringify(result.link.params)}
						result={result}
					/>
				))}
			</div>
		</>
	)
}

function SearchResultListItem({ result }: { result: SearchResult }) {
	return (
		<Link
			to={result.link.to}
			params={result.link.params}
			className="bg-card rounded-xl px-3 py-2 shadow"
		>
			<h3>{result.title}</h3>
			<p>{result.description}</p>
		</Link>
	)
}
