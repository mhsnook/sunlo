import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		component: () => (
			<div className="bg-background text-foreground min-h-dvh">
				<Outlet />
			</div>
		),
	}
)
