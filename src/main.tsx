import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader } from '@/components/ui/loader'

import { AuthProvider } from '@/components/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { ShowError } from '@/components/errors'

import { routeTree } from './routeTree.gen'
import Routes from './routes'

import 'styles/globals.css'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 2 * 60 * 1000, // 2 minutes
			gcTime: 20 * 60 * 1000, // 20 minutes
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		},
	},
})

// Create a new router instance
const router = createRouter({
	routeTree,
	context: {
		auth: undefined!, // we'll make this during render
		queryClient,
	},
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 300_000,
	defaultPendingComponent: () => (
		<div className="flex h-full w-full animate-spin items-center justify-center opacity-70">
			<Loader className="size-12" />
		</div>
	),
	defaultErrorComponent: ({ error }) => (
		<ShowError show={!!error}>Error: {error?.message}</ShowError>
	),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

createRoot(document.getElementById('root')).render(
	<StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<QueryClientProvider client={queryClient}>
				<AuthProvider>
					<Routes router={router} />
				</AuthProvider>
			</QueryClientProvider>
		</ThemeProvider>
	</StrictMode>
)
