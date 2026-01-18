import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { Compass, LogIn, Moon, Sun } from 'lucide-react'
import { HeroSection } from './-homepage/hero-section'
import { CrowdSourcedSection } from './-homepage/crowd-sourced-section'
import { SpacedRepetitionSection } from './-homepage/spaced-repetition-section'
import { SocialLearningSection } from './-homepage/social-learning-section'
import { FooterNavigation } from './-homepage/footer-nav'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/hooks/use-profile'
import { buttonVariants } from '@/components/ui/button'
import { cn, isNativeAppUserAgent } from '@/lib/utils'
import { avatarUrlify } from '@/lib/hooks'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ClientOnly } from '@/components/client-only'

export const Route = createFileRoute('/')({
	component: Index,
	beforeLoad: ({ context }) => {
		// If the app was launched from the user's homescreen shortcut
		// we should skip the homepage and go straight to learning or login
		if (isNativeAppUserAgent()) {
			if (context.auth?.isAuth)
				redirect({
					to: '/learn',
				})
			else {
				redirect({ to: '/login' })
			}
		}
		return context.auth
	},
})

function Index() {
	return (
		<div className="relative">
			<div className="fixed top-6 right-6 z-50 flex flex-col items-center gap-2 @xl:flex-row">
				<ClientOnly>
					<UserLogin />
				</ClientOnly>
				<BrowseLink />
				<ThemeToggle />
			</div>
			<HeroSection />
			<CrowdSourcedSection />
			<SpacedRepetitionSection />
			<SocialLearningSection />
			<FooterNavigation />
		</div>
	)
}

function BrowseLink() {
	return (
		<Link
			className={cn(
				buttonVariants({ variant: 'ghost', size: 'icon' }),
				'border-border/50 h-12 w-12 rounded-full border bg-white/10 text-slate-800 transition-all duration-300 hover:bg-white/50 dark:border-white/10 dark:bg-black/10 dark:text-slate-200 dark:hover:bg-black/50'
			)}
			from={Route.fullPath}
			to="/learn/browse"
			title="Browse the library"
		>
			<Compass className="h-5 w-5" />
			<span className="sr-only">Browse the library</span>
		</Link>
	)
}

function ThemeToggle() {
	const { theme, setTheme } = useTheme()
	const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggle}
			title="Toggle theme"
			className="border-border/50 h-12 w-12 rounded-full border bg-white/10 transition-all duration-300 hover:bg-white/50 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50"
		>
			<Sun className="h-5 w-5 scale-100 rotate-0 text-slate-800 transition-all dark:scale-0 dark:-rotate-90 dark:text-slate-200" />
			<Moon className="absolute h-5 w-5 scale-0 rotate-90 text-slate-800 transition-all dark:scale-100 dark:rotate-0 dark:text-slate-200" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}

function UserLogin() {
	const auth = Route.useRouteContext({ select: (c) => c.auth })
	const { data: profile, isReady } = useProfile()

	// Must check auth state first - if not authenticated, show login link
	// regardless of whether stale profile data exists in the collection
	if (!auth?.isAuth) {
		return (
			<Link
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon' }),
					'border-border/50 h-12 w-12 rounded-full border bg-white/10 transition-all duration-300 hover:bg-white/50 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50'
				)}
				from={Route.fullPath}
				title="Log in"
				to="/login"
			>
				<LogIn className="h-5 w-5 scale-100 rotate-0 text-slate-800 transition-all dark:text-slate-200" />
				<span className="sr-only">Log in</span>
			</Link>
		)
	}

	// User is authenticated - show profile if loaded, otherwise show app link
	return !isReady ? null : (
			<Link
				className="ring-offset-background rounded-squircle focus-visible:ring-ring border-border/50 inline-flex aspect-square h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-white/10 shadow transition-all duration-300 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50"
				from={Route.fullPath}
				title="Go to app"
				to="/learn"
			>
				{profile ?
					<Avatar className="size-12">
						<AvatarImage
							src={avatarUrlify(profile.avatar_path)}
							alt="Your profile pic"
						/>
						<AvatarFallback>{profile.username?.slice(0, 2)}</AvatarFallback>
					</Avatar>
				:	<LogIn className="h-5 w-5 text-slate-800 dark:text-slate-200" />}
				<span className="sr-only">Go to app</span>
			</Link>
		)
}
