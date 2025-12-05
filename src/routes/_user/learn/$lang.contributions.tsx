import { createFileRoute } from '@tanstack/react-router'
import { phraseRequestsCollection } from '@/lib/collections'

export const Route = createFileRoute('/_user/learn/$lang/contributions')({
	loader: async () => {
		await phraseRequestsCollection.preload()
	},
})
