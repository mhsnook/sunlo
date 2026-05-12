import { createFileRoute } from '@tanstack/react-router'
import { languagesCollection } from '@/features/languages/collections'

export const Route = createFileRoute('/_user/admin/')({
	beforeLoad: () => ({
		titleBar: {
			title: 'Admin',
			subtitle: 'Content Management',
		},
	}),
	loader: async () => {
		await languagesCollection.preload()
	},
})
