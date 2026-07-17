import { createFileRoute } from '@tanstack/react-router'
import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { CSSProperties } from 'react'
import {
	phrasesCollection,
	phraseTagLinksCollection,
	phraseTranslationsCollection,
} from '@/features/phrases/collections'
import { usePhraseByHandle } from '@/features/phrases/hooks'
import { Loader } from '@/components/ui/loader'
import { cardsCollection } from '@/features/deck/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

export const Route = createFileRoute('/_user/learn/$lang/phrases/$id')({
	component: RouteComponent,
	staticData: {
		titleBar: { title: 'Phrase' },
	},
	loader: async ({ context }) => {
		const preloads: Promise<unknown>[] = [
			phrasesCollection.preload(),
			phraseTranslationsCollection.preload(),
			phraseTagLinksCollection.preload(),
			publicProfilesCollection.preload(),
		]
		if (context.auth.isAuth) {
			preloads.push(cardsCollection.preload())
		}
		await Promise.all(preloads)
	},
})

const style = { viewTransitionName: `main-area` } as CSSProperties

function RouteComponent() {
	const { id } = Route.useParams()
	// `id` is a public_id in canonical URLs; resolve it to the phrase's uuid so
	// everything below BigPhraseCard keeps working in uuids. Falls back to the
	// raw param (uuid deep links / old bookmarks), and an unresolved handle
	// flows through as-is so BigPhraseCard renders its own not-found state.
	const { data: phrase, isLoading } = usePhraseByHandle(id)
	return (
		<main style={style} data-testid="phrase-detail-page">
			{isLoading ? <Loader /> : <BigPhraseCard pid={phrase?.id ?? id} />}
		</main>
	)
}
