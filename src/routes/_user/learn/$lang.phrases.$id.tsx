import { createFileRoute } from '@tanstack/react-router'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { CSSProperties } from 'react'
import { phrasesCollection } from '@/features/phrases/collections'
import { cardsCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

export const Route = createFileRoute('/_user/learn/$lang/phrases/$id')({
	component: RouteComponent,
	beforeLoad: () => ({
		titleBar: {
			title: 'Phrase',
		},
	}),
	loader: async () => {
		await Promise.all([
			phrasesCollection.preload(),
			cardsCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
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
