import { createFileRoute } from '@tanstack/react-router'
import languages from '@/lib/languages'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	beforeLoad: ({ params: { lang } }) => ({
		titleBar: {
			title: `Review ${languages[lang]} cards`,
			onBackClick: '/learn/$lang',
		},
		appnav: [],
	}),
})
