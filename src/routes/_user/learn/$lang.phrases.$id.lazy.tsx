import { createLazyFileRoute } from '@tanstack/react-router'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { CSSProperties } from 'react'

export const Route = createLazyFileRoute('/_user/learn/$lang/phrases/$id')({
	component: RouteComponent,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function RouteComponent() {
	const { id } = Route.useParams()
	return (
		<main style={style} data-testid="phrase-detail-page">
			<BigPhraseCard pid={id} />
		</main>
	)
}
