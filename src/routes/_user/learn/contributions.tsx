import { createFileRoute } from '@tanstack/react-router'
import { UserContributionsTabs } from './-contributions-tabs'

export const Route = createFileRoute('/_user/learn/contributions')({
	validateSearch: UserContributionsTabs,
	beforeLoad: () => ({
		titleBar: {
			title: 'Contributions to the Library',
			subtitle: 'Your own Requests, Phrases and Playlists',
		},
	}),
})
