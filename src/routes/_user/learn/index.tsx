import { createFileRoute } from '@tanstack/react-router'
import { decksCollection } from '@/features/deck/collections'

export const Route = createFileRoute('/_user/learn/')({
	loader: async ({ context }) => {
		if (context.auth.isAuth) {
			await decksCollection.preload()
		}
	},
})
