import { RouterProvider, Register } from '@tanstack/react-router'
import { useAuth } from '@/lib/use-auth'
import { useMemo } from 'react'
import { MyRouterContext } from './routes/__root'
import { AwaitingAuthLoader } from './components/awaiting-auth-loader'

import { useDbStore } from './lib/db-store'

export default function Routes({ router }: Register) {
	const auth = useAuth()
	const db = useDbStore()

	const context: MyRouterContext = useMemo(() => ({ auth, db }), [auth, db])

	return auth.isLoaded ?
			<RouterProvider router={router} context={context} />
		:	<AwaitingAuthLoader />
}
