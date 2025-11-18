import { createFileRoute } from '@tanstack/react-router'
import { phraseRequestsCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/requests')({
	loader: async () => {
		await phraseRequestsCollection.preload()
	},
})
