import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Loader } from '@/components/ui/loader'

import { AuthProvider } from '@/components/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { ShowError } from '@/components/errors'

import { routeTree } from './routeTree.gen'
import Routes from './routes'

import 'styles/globals.css'
import { Button } from '@/components/ui/button'
import { queryClient } from './lib/query-client'
import { phrasesCollection } from './lib/collections'

// Expose collections to window in dev/test mode for E2E testing
if (
	typeof window !== 'undefined' &&
	(import.meta.env.DEV || import.meta.env.MODE === 'test')
) {
	// @ts-expect-error - adding to window for testing
	window.__phrasesCollection = phrasesCollection
}

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		auth: undefined!, // we'll make this during render
		profile: undefined!, // we'll make this during render
		queryClient,
	},
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 300_000,
	defaultPendingComponent: () => (
		<div className="flex h-full w-full animate-spin items-center justify-center opacity-70">
			<Loader className="size-12" />
		</div>
	),
	defaultErrorComponent: ({ error, reset }) => (
		<ShowError show={!!error}>
			<p>Error: {error?.message}</p>
			<Button
				variant="destructive-outline"
				// oxlint-disable-next-line jsx-no-new-function-as-prop
				onClick={() => reset()}
			>
				Refresh the page
			</Button>
		</ShowError>
	),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

const root = document.getElementById('root')
if (!root) throw new Error('No root element on the page')

createRoot(root).render(
	<StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<Routes router={router} />
				</AuthProvider>
				{/* <ReactQueryDevtools /> */}
			</QueryClientProvider>
		</ThemeProvider>
	</StrictMode>
)
