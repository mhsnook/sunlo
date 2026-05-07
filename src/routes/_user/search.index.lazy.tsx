import { createLazyFileRoute } from '@tanstack/react-router'
import { SearchPage } from './-search-page'

export const Route = createLazyFileRoute('/_user/search/')({
	component: () => <SearchPage />,
})
