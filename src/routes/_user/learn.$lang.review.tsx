import { createFileRoute, Outlet } from '@tanstack/react-router'

import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { BookHeart } from 'lucide-react'
import { todayString } from '@/lib/utils'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
	beforeLoad: () => {
		return { dayString: todayString() }
	},
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
				onBackClick: '/learn/$lang',
			} as TitleBar,
		}
	},
})

function ReviewPage() {
	return <Outlet />
}
