import { createFileRoute } from '@tanstack/react-router'
import { phraseRequestsQuery } from '@/features/requests/queries'
import { languagesQuery } from '@/features/languages/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/welcome')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Welcome to Sunlo',
			subtitle: 'Learn languages with friends',
		},
	}),
	loader: async () => {
		await Promise.all([
			queryClient.ensureQueryData(phraseRequestsQuery),
			queryClient.ensureQueryData(languagesQuery),
		])
	},
})
