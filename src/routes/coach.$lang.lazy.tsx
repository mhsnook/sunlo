import { createLazyFileRoute } from '@tanstack/react-router'
import { CoachPage } from '@/features/coach'
import { useAuth } from '@/lib/use-auth'

export const Route = createLazyFileRoute('/coach/$lang')({
	component: CoachLangRoute,
})

function CoachLangRoute() {
	const { lang } = Route.useParams()
	// Not the route context: that keeps the auth from when the route loaded,
	// and a visitor signs in on this page.
	const { userId, isAnonymous } = useAuth()
	return <CoachPage lang={lang} uid={userId} anonymous={isAnonymous} />
}
