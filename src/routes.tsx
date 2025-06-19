import { QueryClient, useQueryClient } from '@tanstack/react-query'
import { RouterProvider, Register } from '@tanstack/react-router'
import { AuthState } from '@/types/main'
import { useAuth } from '@/lib/hooks'

type RouterContext = {
	auth: AuthState
	queryClient: QueryClient
}

export default function Routes({ router }: Register) {
	const auth = useAuth()
	const queryClient = useQueryClient()
	const context: RouterContext = { auth, queryClient }
	return <RouterProvider router={router} context={context} />
}
