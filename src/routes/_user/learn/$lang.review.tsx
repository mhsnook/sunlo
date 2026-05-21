import { useState } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { todayString } from '@/lib/utils'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
	staticData: {
		appnav: [],
		titleBar: ({ params }) => ({
			title: `Review ${languages[params.lang]} cards`,
			onBackClick: '/learn/$lang',
		}),
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
