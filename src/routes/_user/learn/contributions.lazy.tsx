import { useUserId } from '@/lib/use-auth'
import { createLazyFileRoute } from '@tanstack/react-router'
import { UserContributions } from './-contributions'

export const Route = createLazyFileRoute('/_user/learn/contributions')({
	component: RouteComponent,
})

function RouteComponent() {
	const userId = useUserId()
	return <UserContributions uid={userId!} />
}
