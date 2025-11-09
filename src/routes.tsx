import { RouterProvider, Register } from '@tanstack/react-router'
import { useAuth } from '@/lib/hooks'
import { useMemo } from 'react'
import { MyRouterContext } from './routes/__root'

export default function Routes({ router }: Register) {
	const auth = useAuth()
	const context: MyRouterContext = useMemo(() => ({ auth: auth }), [auth])
	return <RouterProvider router={router} context={context} />
}
