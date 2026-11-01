import { createFileRoute, notFound } from '@tanstack/react-router'
import languages from '@/lib/languages'

export const Route = createFileRoute('/coach/$lang')({
	beforeLoad: ({ params }) => {
		if (!languages[params.lang]) throw notFound()
	},
})
