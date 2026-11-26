import { createFileRoute, notFound } from '@tanstack/react-router'
import { preloadLibrary } from '@/features/coach'
import languages from '@/lib/languages'

export const Route = createFileRoute('/coach/$lang')({
	beforeLoad: ({ params }) => {
		if (!languages[params.lang]) throw notFound()
	},
	loader: () => {
		void preloadLibrary()
	},
})
