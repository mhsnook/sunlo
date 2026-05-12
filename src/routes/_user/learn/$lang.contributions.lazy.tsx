import { createLazyFileRoute } from '@tanstack/react-router'

import { UserContributions } from './-contributions'
import type { CSSProperties } from 'react'

export const Route = createLazyFileRoute('/_user/learn/$lang/contributions')({
	component: Page,
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
