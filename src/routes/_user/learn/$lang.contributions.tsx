import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { phraseRequestsQuery } from '@/features/requests/queries'
import { queryClient } from '@/lib/query-client'

import { UserContributionsTabs } from './-contributions-tabs'

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	validateSearch: UserContributionsTabs,
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Contributions to the ${languages[lang]} Library`,
			subtitle: '',
		},
	}),
	loader: async () => {
		await queryClient.ensureQueryData(phraseRequestsQuery)
	},
})
