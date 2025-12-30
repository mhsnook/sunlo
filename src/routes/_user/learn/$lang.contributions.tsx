import { createFileRoute, Link } from '@tanstack/react-router'
import { Disc3, MessageCircleHeart, MessageSquareQuote } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button-variants'
import languages from '@/lib/languages'
import { phraseRequestsCollection } from '@/lib/collections'
import { PlusMenu } from '@/components/plus-menu'
import { UserContributions } from './-contributions'
import type { CSSProperties } from 'react'
import { UserContributionsTabs } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	validateSearch: UserContributionsTabs,
	component: Page,
	loader: async ({ params: { lang } }) => {
		await phraseRequestsCollection.preload()
		return {
			titleBar: {
				title: `Contributions to the ${languages[lang]} Library`,
				subtitle: '',
			},
		}
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function Page() {
	const params = Route.useParams()
	const uid = Route.useRouteContext().auth.userId!

	return (
		<main style={style}>
			<div>
				<div className="flex flex-row items-center justify-between gap-2">
					<h2 className="h2">Your Requests and Phrases</h2>
					<PlusMenu>
						<Link
							to="/learn/$lang/requests/new"
							from={Route.fullPath}
							className={
								`${buttonVariants({
									variant: 'outline',
								})}` as const
							}
						>
							<MessageCircleHeart className="size-3" />
							<span className="me-1">New request</span>
						</Link>
						<Link
							to="/learn/$lang/add-phrase"
							from={Route.fullPath}
							className={
								`${buttonVariants({
									variant: 'outline',
								})}` as const
							}
						>
							<MessageSquareQuote className="size-3" />
							<span className="me-1">New Phrase</span>
						</Link>
						<Link
							to="/learn/$lang/playlists/new"
							from={Route.fullPath}
							className={
								`${buttonVariants({
									variant: 'outline',
								})}` as const
							}
						>
							<Disc3 className="size-3" />
							<span className="me-1">New Playlist</span>
						</Link>
					</PlusMenu>
				</div>
				<UserContributions uid={uid} lang={params.lang} />
			</div>
		</main>
	)
}
