import type { PropsWithChildren } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { QueryClientProvider } from '@tanstack/react-query'
import {
	createRootRouteWithContext,
	Link,
	Outlet,
	useNavigate,
	HeadContent,
	Scripts,
} from '@tanstack/react-router'
import { Toaster } from 'react-hot-toast'

import type { AuthState } from '@/lib/use-auth'
import { SidebarProvider } from '@/components/ui/sidebar'
import Callout from '@/components/ui/callout'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { OctogonMinusDangerBadge } from '@/components/ui/badge'
import { TitleBar } from '@/types/main'
import { AuthProvider } from '@/components/auth-context'
import { ThemeProvider } from '@/components/theme-provider'
import { queryClient } from '@/lib/query-client'

import '@/styles/globals.css'

export interface MyRouterContext {
	auth: AuthState
	queryClient: QueryClient
	titleBar?: TitleBar
	appnav?: string[]
	contextMenu?: string[]
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
		],
		links: [
			{ rel: 'icon', type: 'image/png', href: '/favicon.png', sizes: '180x180' },
			{ rel: 'preload', href: '/images/logo-pair.png', as: 'image' },
		],
	}),
})

function RootDocument({ children }: PropsWithChildren) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
					<QueryClientProvider client={queryClient}>
						<AuthProvider>{children}</AuthProvider>
					</QueryClientProvider>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	)
}

function RootComponent() {
	return (
		<RootDocument>
			<SidebarProvider>
				<div className="@container mx-auto w-full">
					<Outlet />
				</div>
				<Toaster position="top-center" />
			</SidebarProvider>
		</RootDocument>
	)
}

function NotFoundComponent() {
	const navigate = useNavigate()
	const goBack = () => {
		void navigate({ to: '..' })
	}
	return (
		<RootDocument>
			<div className="flex h-full w-full items-center justify-center py-10">
				<Callout variant="problem" Icon={OctogonMinusDangerBadge}>
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
		</RootDocument>
	)
}
