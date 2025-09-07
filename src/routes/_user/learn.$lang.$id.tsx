import { BigPhraseCard } from '@/components/cards/big-phrase-card'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_user/learn/$lang/$id')({
	component: RouteComponent,
})

function RouteComponent() {
	const { lang, id } = Route.useParams()
	return <BigPhraseCard pid={id} lang={lang} />
}
