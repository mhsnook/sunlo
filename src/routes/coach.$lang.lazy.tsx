import { createLazyFileRoute } from '@tanstack/react-router'
import { CoachPage } from '@/features/coach'

export const Route = createLazyFileRoute('/coach/$lang')({
	component: CoachLangRoute,
})

function CoachLangRoute() {
	const { lang } = Route.useParams()
	return <CoachPage lang={lang} />
}
