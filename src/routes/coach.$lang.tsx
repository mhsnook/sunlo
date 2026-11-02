import { createFileRoute, notFound } from '@tanstack/react-router'
import { ensureCoachThread, preloadLibrary } from '@/features/coach'
import languages from '@/lib/languages'

export const Route = createFileRoute('/coach/$lang')({
	beforeLoad: ({ params }) => {
		if (!languages[params.lang]) throw notFound()
	},
	loader: ({ params, context: { auth } }) => {
		ensureCoachThread(auth.userId!, params.lang)
		void preloadLibrary()
	},
})
