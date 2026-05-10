import { type CSSProperties } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Search, Share } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { FriendsFeed } from './-friends-feed'

export const Route = createFileRoute('/_user/friends/')({
	component: FriendsHomePage,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function FriendsHomePage() {
	return (
		<main
			className="w-full space-y-6"
			style={style}
			data-testid="friends-home-page"
		>
			<header className="flex flex-col items-start justify-between gap-3 @md:flex-row @md:items-center">
				<div>
					<h1 className="text-2xl leading-tight font-bold @md:text-3xl">
						Friends
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Recent activity from people you've connected with.
					</p>
				</div>
				<div className="flex flex-row gap-2">
					<Link
						from="/friends"
						search={{ search: true }}
						className={buttonVariants({ variant: 'soft' })}
						data-testid="friends-find-link"
					>
						<Search className="size-4" />
						Find friends
					</Link>
					<Link
						to="/friends/invite"
						className={buttonVariants({ variant: 'soft' })}
						data-testid="friends-invite-link"
					>
						<Share className="size-4" />
						Invite
					</Link>
				</div>
			</header>

			<section
				className="space-y-3"
				aria-labelledby="friends-feed-heading"
				data-testid="friends-feed-section"
			>
				<h2
					id="friends-feed-heading"
					className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
				>
					Recent from friends
				</h2>
				<FriendsFeed />
			</section>
		</main>
	)
}
