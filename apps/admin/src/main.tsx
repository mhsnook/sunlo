import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import supabase from '@/lib/supabase-client'
import { ThemeProvider } from '@/components/theme-provider'
import { Loader } from '@/components/ui/loader'
import { routeTree } from './routeTree.gen'

import './styles.css'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 60_000, refetchOnWindowFocus: false },
	},
})

const router = createRouter({
	routeTree,
	context: { queryClient },
	defaultPreload: 'intent',
	defaultPendingComponent: () => (
		<Loader size={48} className="mt-20 opacity-50" />
	),
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

supabase.auth.onAuthStateChange((event) => {
	if (event === 'SIGNED_OUT') {
		queryClient.clear()
		void router.navigate({ to: '/login' })
	}
})

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="system">
			<QueryClientProvider client={queryClient}>
				<RouterProvider router={router} />
			</QueryClientProvider>
		</ThemeProvider>
	</StrictMode>
)
