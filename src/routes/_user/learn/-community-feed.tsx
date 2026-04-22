import { Link } from '@tanstack/react-router'
import { ChevronsRight } from 'lucide-react'

import { useFeedLang } from '@/features/feed/hooks'
import { FeedItem } from '@/components/feed/feed-item'
import languages from '@/lib/languages'

export function CommunityFeedSnippet({
	lang,
	limit = 3,
}: {
	lang: string
	limit?: number
}) {
	const { data, isLoading } = useFeedLang(lang)
	const items = (data?.pages.flat() ?? []).slice(0, limit)

	if (isLoading && items.length === 0) {
		return (
			<p className="text-muted-foreground text-sm italic">
				Loading recent activity...
			</p>
		)
	}

	if (items.length === 0) {
		return (
			<div className="text-muted-foreground text-sm">
				<p className="italic">
					Nothing new from the community yet for {languages[lang]}.
				</p>
				<Link
					to="/learn/$lang/requests/new"
					params={{ lang }}
					className="s-link-muted mt-2 inline-flex items-center gap-1"
				>
					Start a conversation
					<ChevronsRight className="h-4 w-4" />
				</Link>
			</div>
		)
	}

	return (
		<div className="space-y-4" data-testid="community-feed-snippet">
			{items.map((item) => (
				<FeedItem key={item.id} item={item} />
			))}
			<Link
				to="/learn/$lang/feed"
				params={{ lang }}
				className="s-link-muted inline-flex items-center gap-1 text-sm"
				data-testid="view-full-feed-link"
			>
				View the full feed
				<ChevronsRight className="h-4 w-4" />
			</Link>
		</div>
	)
}
