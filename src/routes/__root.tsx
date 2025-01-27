import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useNavigate,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthState } from '@/components/auth-context'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
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
			<div className="flex h-screen overflow-hidden w-full">
				<AppSidebar />
				<SidebarInset className="flex-1 w-full">
					<header className="hidden h-16 shrink-0 items-center gap-2 border-b px-6">
						<SidebarTrigger />
						<Separator orientation="vertical" className="mx-2 h-6" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:inline-flex">
									<BreadcrumbLink href="#">
										Building Your Application
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:inline-flex" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</header>
					<div className="mx-auto w-full max-w-[960px] @container">
						<Outlet />
					</div>
				</SidebarInset>
			</div>
			<Toaster position="bottom-center" />
		</SidebarProvider>
	)
}

function NotFoundComponent() {
	const navigate = useNavigate()
	const goBack = useCallback(() => {
		void navigate({ to: '..' })
	}, [navigate])
	return (
		<div className="flex justify-center items-center w-full h-full py-10">
			<Callout variant="problem">
				<Badge variant="destructive" className="p-2">
					<OctagonMinus />
				</Badge>
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
