import { createFileRoute, Outlet } from '@tanstack/react-router'
import { phrasesCollection } from '@/features/phrases/collections'
import { phraseRequestsCollection } from '@/features/requests/collections'
import { langTagsCollection } from '@/features/languages/collections'
import { publicProfilesCollection } from '@/features/profile/collections'

export const Route = createFileRoute('/_user/admin/$lang')({
	component: () => <Outlet />,
	loader: async () => {
		await Promise.all([
			phrasesCollection.preload(),
			phraseRequestsCollection.preload(),
			langTagsCollection.preload(),
			publicProfilesCollection.preload(),
		])
	},
})
