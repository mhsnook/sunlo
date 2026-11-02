import { createLazyFileRoute } from '@tanstack/react-router'
import { CoachPage } from '@/features/coach'

export const Route = createLazyFileRoute('/coach/$lang')({
	component: CoachLangRoute,
})

function CoachLangRoute() {
	const { lang } = Route.useParams()
	const { auth } = Route.useRouteContext()
	// /coach redirects to /login before any child route loads without a user.
	return <CoachPage lang={lang} uid={auth.userId!} />
}
