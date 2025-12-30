import { useUserId } from '@/lib/use-auth'
import { createFileRoute } from '@tanstack/react-router'
import { UserContributions } from './-contributions'
import { UserContributionsTabs } from '@/lib/schemas'

export const Route = createFileRoute('/_user/learn/contributions')({
	validateSearch: UserContributionsTabs,
	loader: () => ({
		titleBar: {
			title: `Contributions to the Library`,
			subtitle: 'Your own Requests, Phrases and Playlists',
		},
	}),
	component: RouteComponent,
})

function RouteComponent() {
	const userId = useUserId()
	return <UserContributions uid={userId} />
}
