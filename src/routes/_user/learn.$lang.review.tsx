import { createFileRoute, Outlet } from '@tanstack/react-router'
import { TitleBar } from '@/types/main'
import languages from '@/lib/languages'
import { BookHeart } from 'lucide-react'
import { todayString } from '@/lib/utils'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'
import { useState } from 'react'

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
	const [dayString] = useState(() => todayString())

	return (
		<ReviewStoreProvider
			key={`${lang}:${dayString}`}
			lang={lang}
			dayString={dayString}
		>
			<Outlet />
		</ReviewStoreProvider>
	)
}
