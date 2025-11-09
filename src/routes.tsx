import { RouterProvider, Register } from '@tanstack/react-router'
import { useAuth } from '@/lib/hooks'

export default function Routes({ router }: Register) {
	const auth = useAuth()
	return <RouterProvider router={router} context={{ auth }} />
}
