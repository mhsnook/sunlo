import type { QueryClient } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import { Toasters } from '@/components/ui/sonner'

import type { AuthState } from '@/lib/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { OctagonMinus } from 'lucide-react'
import { TitleBar } from '@/types/main'

export interface MyRouterContext {
	auth: AuthState
	queryClient: QueryClient
	titleBar?: TitleBar
	appnav?: string[]
	contextMenu?: string[]
	focusMode?: boolean
	wideContent?: boolean
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
})

function RootComponent() {
	return (
		<SidebarProvider>
			<div className="@container mx-auto w-full">
				<Outlet />
			</div>
			<Toasters />
		</SidebarProvider>
	)
}

function NotFoundComponent() {
	const navigate = useNavigate()
	const goBack = () => {
		void navigate({ to: '..' })
	}
	return (
		<div className="flex h-full w-full items-center justify-center p-4">
			<Callout variant="problem" Icon={OctagonMinus}>
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
