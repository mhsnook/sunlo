import { TitleBar } from '@/types/main'

import { useState } from 'react'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import languages from '@/lib/languages'
import { todayString } from '@/lib/utils'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
	loader: ({ params: { lang } }) => {
		return {
			titleBar: {
				title: `Review ${languages[lang]} cards`,
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
