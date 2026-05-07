import { lazy, Suspense } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import { OctagonMinus } from 'lucide-react'
import { Toasters } from '@/components/ui/sonner'
import type { AuthState } from '@/lib/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { TitleBar } from '@/types/main'

// Dev-only identity switcher. The ternary collapses to null in production
// builds (import.meta.env.DEV is statically replaced), so the dynamic
// import() call becomes unreachable and vite tree-shakes the whole chunk.
const DevIdentitySwitcher = import.meta.env.DEV
	? lazy(() =>
			import('@/components/dev-identity-switcher').then((m) => ({
				default: m.DevIdentitySwitcher,
			}))
		)
	: null

export interface MyRouterContext {
	auth: AuthState
	queryClient: QueryClient
	titleBar?: TitleBar
	appnav?: string[]
	contextMenu?: string[]
	searchAction?: boolean
	focusMode?: boolean
	wideContent?: boolean
	fixedHeight?: boolean
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
			{DevIdentitySwitcher ? (
				<Suspense fallback={null}>
					<DevIdentitySwitcher />
				</Suspense>
			) : null}
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
						<Button onClick={goBack} variant="soft">
							Go Back
						</Button>
						<Link to="/" className={buttonVariants({ variant: 'soft' })}>
							Go home
						</Link>
						<Link to="/learn" className={buttonVariants({ variant: 'soft' })}>
							Learning dashboard
						</Link>
						<Link to="/profile" className={buttonVariants({ variant: 'soft' })}>
							Your profile
						</Link>
					</div>
				</div>
			</Callout>
		</div>
	)
}
