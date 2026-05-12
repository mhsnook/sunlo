import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'

export const Route = createFileRoute('/_user/learn/$lang/bulk-add')({
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Bulk Add ${languages[lang]} Phrases`,
		},
	}),
})
