import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { phraseRequestsCollection } from '@/lib/collections'

import { UserContributions } from './-contributions'
import type { CSSProperties } from 'react'
import { UserContributionsTabs } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	validateSearch: UserContributionsTabs,
	component: Page,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Contributions to the ${languages[lang]} Library`,
			subtitle: '',
		},
	}),
	loader: async () => {
		await phraseRequestsCollection.preload()
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function Page() {
	const params = Route.useParams()
	const uid = Route.useRouteContext().auth.userId!

	return (
		<main style={style} data-testid="contributions-page">
			<UserContributions uid={uid} lang={params.lang} />
		</main>
	)
}
