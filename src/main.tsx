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

import '@/styles/globals.css'
import { Button } from '@/components/ui/button'
import { queryClient } from './lib/query-client'
import './test-runtime-helpers'

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		auth: undefined!, // we'll make this during render
		queryClient,
	},
	defaultViewTransition: true,
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 300_000,
	defaultPendingComponent: () => (
		<Loader size={48} className="pb-40 opacity-50" />
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
