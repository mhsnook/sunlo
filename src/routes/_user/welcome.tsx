import { createFileRoute } from '@tanstack/react-router'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { languagesCollection } from '@/features/languages/collections'

export const Route = createFileRoute('/_user/welcome')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Welcome to Sunlo',
			subtitle: 'Learn languages with friends',
		},
	}),
	loader: async () => {
		await Promise.all([
			phraseRequestsCollection.preload(),
			languagesCollection.preload(),
		])
	},
})
