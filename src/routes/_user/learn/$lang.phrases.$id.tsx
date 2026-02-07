import { createFileRoute } from '@tanstack/react-router'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/$lang/phrases/$id')({
	component: RouteComponent,
	beforeLoad: () => ({
		titleBar: {
			title: 'Phrase',
		},
	}),
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
