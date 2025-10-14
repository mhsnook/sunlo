import { useCallback } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'

import { LogIn, Moon, Sun } from 'lucide-react'
import { HeroSection } from './-homepage/hero-section'
import { CrowdSourcedSection } from './-homepage/crowd-sourced-section'
import { SpacedRepetitionSection } from './-homepage/spaced-repetition-section'
import { SocialLearningSection } from './-homepage/social-learning-section'
import { FooterNavigation } from './-homepage/footer-nav'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { useProfileLazy } from '@/hooks/use-profile'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn, isNativeAppUserAgent } from '@/lib/utils'
import { useAvatarUrl } from '@/lib/hooks'

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
				<UserLogin />
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

function ThemeToggle() {
	const { theme, setTheme } = useTheme()
	const toggle = useCallback(
		() => setTheme(theme === 'light' ? 'dark' : 'light'),
		[setTheme, theme]
	)

	return (
		<Button
			variant="ghost"
			size="icon"
			// oxlint-disable-next-line jsx-no-new-function-as-prop
			onClick={toggle}
			className="border-border/50 h-12 w-12 rounded-full border bg-white/10 transition-all duration-300 hover:bg-white/50 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50"
		>
			<Sun className="h-5 w-5 scale-100 rotate-0 text-slate-800 transition-all dark:scale-0 dark:-rotate-90 dark:text-slate-200" />
			<Moon className="absolute h-5 w-5 scale-0 rotate-90 text-slate-800 transition-all dark:scale-100 dark:rotate-0 dark:text-slate-200" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	)
}

function UserLogin() {
	const { data: profile } = useProfileLazy()
	const avatarUrl = useAvatarUrl(profile?.avatar_path)
	return profile ?
			<Link
				className="ring-offset-background focus-visible:ring-ring border-border/50 inline-flex aspect-square h-12 w-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-white/10 shadow transition-all duration-300 hover:bg-white/50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50"
				from={Route.fullPath}
				to="/learn"
			>
				<img
					src={avatarUrl}
					alt="Your profile pic"
					className="h-full w-full object-cover transition-opacity hover:opacity-70"
				/>
				<span className="sr-only">Log in</span>
			</Link>
		:	<Link
				className={cn(
					buttonVariants({ variant: 'ghost', size: 'icon' }),
					'border-border/50 h-12 w-12 rounded-full border bg-white/10 transition-all duration-300 hover:bg-white/50 dark:border-white/10 dark:bg-black/10 dark:hover:bg-black/50'
				)}
				from={Route.fullPath}
				to="/login"
			>
				<LogIn className="h-5 w-5 scale-100 rotate-0 text-slate-800 transition-all dark:text-slate-200" />
				<span className="sr-only">Log in</span>
			</Link>
}
