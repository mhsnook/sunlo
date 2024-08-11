import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { routeTree } from './routeTree.gen'
import './styles/globals.css'
import Loading from './components/loading'
import ShowError from './components/show-error'
import { AuthProvider } from './components/auth-context'
import { blankAuthState } from './types/main'

const queryClient = new QueryClient()

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    auth: blankAuthState,
    queryClient,
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 300_000,
  defaultPendingComponent: Loading,
  defaultErrorComponent: ({ error }) => <ShowError>{error.message}</ShowError>,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
