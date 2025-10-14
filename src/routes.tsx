import { useQueryClient } from '@tanstack/react-query'
import { RouterProvider, Register } from '@tanstack/react-router'
import { useAuth } from '@/lib/hooks'
import { useProfile } from './hooks/use-profile'
import { useMemo } from 'react'
import { MyRouterContext } from './routes/__root'

export default function Routes({ router }: Register) {
	const auth = useAuth()
	const { data: profile } = useProfile()
	const queryClient = useQueryClient()
	const context: MyRouterContext = useMemo(
		() => ({ auth, profile, queryClient }),
		[auth, profile, queryClient]
	)
	if (auth === undefined) return null
	return <RouterProvider router={router} context={context} />
}
