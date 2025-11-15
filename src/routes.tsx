import { useQueryClient } from '@tanstack/react-query'
import { RouterProvider, Register } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { useMemo } from 'react'
import { MyRouterContext } from './routes/__root'
import { AwaitingAuthLoader } from './components/awaiting-auth-loader'

export default function Routes({ router }: Register) {
	const auth = useAuth()
	const queryClient = useQueryClient()
	const context: MyRouterContext = useMemo(
		() => ({ auth: auth, queryClient }),
		[auth, queryClient]
	)
	return auth.isLoaded ?
			<RouterProvider router={router} context={context} />
		:	<AwaitingAuthLoader />
}
