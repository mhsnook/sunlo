import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { phraseRequestsCollection } from '@/features/requests/collections'

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
		await phraseRequestsCollection.preload()
	},
})
