import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthState } from '@/components/auth-context'
import { SidebarProvider } from '@/components/ui/sidebar'

import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button-variants'
import { OctagonMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback } from 'react'
import { Badge } from '@/components/ui/badge'

interface MyRouterContext {
	auth: AuthState
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
})

function RootComponent() {
	return (
		<SidebarProvider>
			<div className="@container mx-auto w-full max-w-[1080px] ps-2 pe-2 md:ps-0">
				<Outlet />
			</div>
			<Toaster position="top-center" />
		</SidebarProvider>
	)
}

function NotFoundComponent() {
	const navigate = useNavigate()
	const goBack = useCallback(() => {
		void navigate({ to: '..' })
	}, [navigate])
	return (
		<div className="flex h-full w-full items-center justify-center py-10">
			<Callout
				variant="problem"
				Icon={() => (
					<Badge variant="destructive" className="p-2">
						<OctagonMinus />
					</Badge>
				)}
			>
				<div className="flex flex-col gap-4">
					<h1 className="text-2xl">404: Page not found</h1>
					<p>We did not find a page matching that URL</p>
					<div className="flex flex-row flex-wrap gap-2">
						<Button onClick={goBack} variant="outline">
							Go Back
						</Button>
						<Link to="/" className={buttonVariants({ variant: 'outline' })}>
							Go home
						</Link>
						<Link
							to="/learn"
							className={buttonVariants({ variant: 'outline' })}
						>
							Learning dashboard
						</Link>
						<Link
							to="/profile"
							className={buttonVariants({ variant: 'outline' })}
						>
							Your profile
						</Link>
					</div>
				</div>
			</Callout>
		</div>
	)
}
