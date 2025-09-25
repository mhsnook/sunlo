import { createFileRoute } from '@tanstack/react-router'
import { allMyPhraseRequestsQuery } from '@/hooks/use-requests'

export const Route = createFileRoute('/_user/learn/$lang/requests')({
	loader: async ({
		context: {
			queryClient,
			auth: { userId },
		},
		params: { lang },
	}) => {
		await queryClient.ensureQueryData(allMyPhraseRequestsQuery(lang, userId!))
	},
})
