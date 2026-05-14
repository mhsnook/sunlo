import { createFileRoute } from '@tanstack/react-router'
import { phrasesQuery } from '@/features/phrases/queries'
import { phraseRequestsQuery } from '@/features/requests/queries'
import { langTagsQuery } from '@/features/languages/queries'
import { publicProfilesQuery } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/admin/$lang')({
	loader: async () => {
		await Promise.all([
			queryClient.ensureQueryData(phrasesQuery),
			queryClient.ensureQueryData(phraseRequestsQuery),
			queryClient.ensureQueryData(langTagsQuery),
			queryClient.ensureQueryData(publicProfilesQuery),
		])
	},
})
