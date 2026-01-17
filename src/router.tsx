import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { Loader } from '@/components/ui/loader'
import { ShowError } from '@/components/errors'
import { Button } from '@/components/ui/button'
import { queryClient } from './lib/query-client'

export function getRouter() {
	const router = createRouter({
		routeTree,
		context: {
			auth: undefined!, // we'll inject this during render via AuthProvider
			queryClient,
		},
		defaultViewTransition: true,
		defaultPreload: 'intent',
		defaultPreloadStaleTime: 300_000,
		scrollRestoration: true,
		defaultPendingComponent: () => (
			<Loader size={48} className="pb-40 opacity-50" />
		),
		defaultErrorComponent: ({ error, reset }) => (
			<ShowError show={!!error}>
				<p>Error: {error?.message}</p>
				<Button variant="destructive-outline" onClick={() => reset()}>
					Refresh the page
				</Button>
			</ShowError>
		),
		defaultNotFoundComponent: () => (
			<ShowError>
				<p>404: Could not find that page</p>
				<p>
					Please check your URL and try again. Or refresh the page to continue.
				</p>
			</ShowError>
		),
	})

	return router
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>
	}
}
