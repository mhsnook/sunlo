import { createFileRoute, Link } from '@tanstack/react-router'
import { MessageCircleHeart } from 'lucide-react'
import * as z from 'zod'

import { buttonVariants } from '@/components/ui/button-variants'
import languages from '@/lib/languages'
import { phraseRequestsCollection } from '@/lib/collections'
import { PlusMenu } from '@/components/plus-menu'
import { UserContributions } from './-contributions'

const Search = z.object({
	type: z.enum(['request', 'phrase', 'comment']).optional(),
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

function Page() {
	const params = Route.useParams()
	const uid = Route.useRouteContext().auth.userId!

	return (
		<main>
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
					</PlusMenu>
				</div>
				<UserContributions uid={uid} lang={params.lang} />
			</div>
		</main>
	)
}
