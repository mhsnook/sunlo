import { createFileRoute } from '@tanstack/react-router'
import { decksQuery } from '@/features/deck/queries'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/_user/learn/')({
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await queryClient.ensureQueryData(decksQuery)
		}
	},
})
