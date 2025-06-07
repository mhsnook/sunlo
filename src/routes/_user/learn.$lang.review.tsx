import { createFileRoute, Outlet, useParams } from '@tanstack/react-router'
import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { BookHeart } from 'lucide-react'
import { todayString } from '@/lib/utils'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
	loader: ({ params: { lang } }) => {
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
	const { lang } = Route.useParams()
	const [dayString] = todayString()

	return (
		<ReviewStoreProvider key={`${lang}:${dayString}`}>
			<Outlet />
		</ReviewStoreProvider>
	)
}
