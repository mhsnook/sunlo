import { createFileRoute } from '@tanstack/react-router'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { CSSProperties } from 'react'

export const Route = createFileRoute('/_user/learn/$lang/$id')({
	component: RouteComponent,
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function RouteComponent() {
	const { id } = Route.useParams()
	return (
		<main style={style}>
			<BigPhraseCard pid={id} />
		</main>
	)
}
