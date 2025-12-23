import { createFileRoute, Link } from '@tanstack/react-router'
import { MessageCircleHeart, MessageSquareQuote } from 'lucide-react'
import * as z from 'zod'

import { buttonVariants } from '@/components/ui/button-variants'
import languages from '@/lib/languages'
import { phraseRequestsCollection } from '@/lib/collections'
import { PlusMenu } from '@/components/plus-menu'
import { UserContributions } from './-contributions'
import { CSSProperties } from 'react'

const Search = z.object({
	contributionsTab: z.enum(['request', 'phrase', 'comment']).optional(),
})

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	validateSearch: Search,
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
					</PlusMenu>
				</div>
				<UserContributions uid={uid} lang={params.lang} />
			</div>
		</main>
	)
}
