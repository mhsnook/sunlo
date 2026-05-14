import { createFileRoute } from '@tanstack/react-router'
import { languagesQuery } from '@/features/languages/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/admin/')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Admin',
			subtitle: 'Content Management',
		},
	}),
	loader: async () => {
		await queryClient.ensureQueryData(languagesQuery)
	},
})
