import {
	useState,
	useRef,
	useEffect,
	useCallback,
	type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Search, X } from 'lucide-react'

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ProfileWithRelationship } from '@/components/profile-with-relationship'
import { Loader } from '@/components/ui/loader'
import { Garlic } from '@/components/garlic'
import Callout from '@/components/ui/callout'
import { useSearchProfilesByUsername } from '@/features/social/public-profile'
import { useUserId } from '@/lib/use-auth'
import { usePrevious } from '@/hooks/use-debounce'

export default function FriendSearchOverlay({
	onClose,
}: {
	onClose: () => void
}) {
	const inputRef = useRef<HTMLInputElement>(null)
	const userId = useUserId()

	const [query, setQuery] = useState('')
	const debouncedQuery = useDebounce(query, 150)
	const hasQuery = (debouncedQuery ?? '').trim().length > 0

	const { data: searchResults, isLoading } = useSearchProfilesByUsername(
		debouncedQuery ?? ''
	)

	const prevResults = usePrevious(searchResults)
	const resultsToShow = !hasQuery ? [] : (searchResults ?? prevResults ?? [])
	const filteredResults = resultsToShow.filter((p) => p.uid !== userId)
	const showLoader = filteredResults.length === 0 && isLoading

	// Focus input on mount
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 50)
		return () => clearTimeout(t)
	}, [])

	const handleKeyDown = useCallback(
		(e: ReactKeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
			}
		},
		[onClose]
	)

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent
				className={`flex max-h-[80vh] ${!hasQuery ? 'max-w-xl gap-2 p-4' : 'gap-0 p-0'} flex-col overflow-hidden`}
				data-testid="friend-search-overlay"
			>
				{/* Heading */}
				<div className="px-4 pt-4 pb-0">
					<DialogTitle
						className={`text-muted-foreground ${hasQuery ? 'text-sm' : 'text-xl'} font-medium`}
					>
						Search for friends
					</DialogTitle>
				</div>

				{/* Search Input */}
				<div className="p-3" role="search" onKeyDown={handleKeyDown}>
					<div className="bg-muted/50 flex items-center gap-3 rounded-2xl border px-3 py-2 inset-shadow-sm">
						<Search className="text-muted-foreground size-5 shrink-0" />
						<input
							ref={inputRef}
							type="text"
							placeholder="Search by username..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className={`${hasQuery ? 'text-base' : 'p-2 text-xl'} placeholder:text-muted-foreground flex-1 bg-transparent outline-none`}
							data-testid="friend-search-input"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery('')}
								className="text-muted-foreground hover:text-foreground"
							>
								<X className="size-4" />
							</button>
						)}
					</div>
				</div>

				{/* Results */}
				{hasQuery && (
					<div
						className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4"
						data-testid="friend-search-results"
					>
						{showLoader ?
							<div className="flex h-20 items-center justify-center opacity-50">
								<Loader />
							</div>
						: filteredResults.length === 0 ?
							<Callout variant="ghost" Icon={BigGarlic}>
								<p>No users match that search, but you can invite a friend!</p>
							</Callout>
						:	<>
								<p className="text-muted-foreground ms-1 text-sm italic">
									{filteredResults.length} result
									{filteredResults.length === 1 ? '' : 's'}
								</p>
								{filteredResults.map((profile) => (
									<div key={profile.uid} className="rounded p-2 pe-4 shadow">
										<ProfileWithRelationship uid={profile.uid} />
									</div>
								))}
							</>
						}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}

const BigGarlic = () => (
	<Garlic className="bg-2-mlo-primary w-20 rounded-full p-3 @xl:p-4" />
)
