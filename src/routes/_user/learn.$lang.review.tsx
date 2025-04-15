import { createFileRoute, Outlet } from '@tanstack/react-router'

import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { BookHeart } from 'lucide-react'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
	loader: async ({ params: { lang } }) => {
		return {
			contextMenu: [
				'/learn/$lang/search',
				'/learn/$lang/add-phrase',
				'/learn/$lang/deck-settings',
			],
			titleBar: {
				title: `Review ${languages[lang]} cards`,
				Icon: BookHeart,
			} as TitleBar,
		}
	},
})

function ReviewPage() {
	return <Outlet />
}
