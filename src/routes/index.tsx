import { useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Moon, Sun } from 'lucide-react'
import { HeroSection } from '@/components/homepage/hero-section'
import { CrowdSourcedSection } from '@/components/homepage/crowd-sourced-section'
import { SpacedRepetitionSection } from '@/components/homepage/spaced-repetition-section'
import { SocialLearningSection } from '@/components/homepage/social-learning-section'
import { FooterNavigation } from '@/components/homepage/footer-nav'
import { useTheme } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
	component: Index,
})

function Index() {
	return (
		<div className="relative">
			<ThemeToggle />
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
