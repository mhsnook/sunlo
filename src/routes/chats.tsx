import { createFileRoute, Outlet } from '@tanstack/react-router'
import { languagesCollection } from '@/features/languages/collections'

export const Route = createFileRoute('/chats')({
	component: () => <Outlet />,
	// Languages are foundational public data. An empty languagesCollection
	// means the meta_language materialized view was never populated — its
	// refresh triggers are disabled during replica-mode seeding, so
	// seed-zzz.sql has to refresh it. Fail loudly here so CI catches a broken
	// seed pipeline instead of silently rendering an empty language list.
	loader: async () => {
		await languagesCollection.preload()
		if (languagesCollection.size === 0)
			throw new Error(
				'No languages loaded — the meta_language materialized view is empty. The seed pipeline did not refresh it.'
			)
	},
})
