import { createFileRoute } from '@tanstack/react-router'
import { languagesCollection } from '@/features/languages/collections'
import { publicProfilesCollection } from '@/features/profile/collections'
import {
	messageTagLinksCollection,
	messageTagsCollection,
	messagesCollection,
	phraseRequestsCollection,
} from '@/features/requests/collections'

export const Route = createFileRoute('/_user/admin/messages')({
	staticData: {
		appnav: ['/admin/messages'],
		titleBar: { title: 'Admin', subtitle: 'Messages & Tags' },
	},
	loader: async () => {
		await Promise.all([
			languagesCollection.preload(),
			publicProfilesCollection.preload(),
			messagesCollection.preload(),
			phraseRequestsCollection.preload(),
			messageTagsCollection.preload(),
			messageTagLinksCollection.preload(),
		])
	},
})
