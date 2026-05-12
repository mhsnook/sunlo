import { useState } from 'react'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'
import { todayString } from '@/lib/utils'
import { ReviewStoreProvider } from '@/components/review/review-context-provider'

export const Route = createLazyFileRoute('/_user/learn/$lang/review')({
	component: ReviewPage,
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
